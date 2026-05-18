document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Charts
    const ctxRad = document.getElementById('radiationChart').getContext('2d');
    const ctxTemp = document.getElementById('temperatureChart').getContext('2d');

    const chartConfig = (label, color) => ({
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: color,
                backgroundColor: color + '33', // 20% opacity
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            scales: {
                x: { display: false },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
            },
            plugins: { legend: { display: false } }
        }
    });

    const radChart = new Chart(ctxRad, chartConfig('Radiation', '#ef4444'));
    const tempChart = new Chart(ctxTemp, chartConfig('Temperature', '#f59e0b'));

    // DOM Elements
    const elTemp = document.getElementById('val-temp');
    const elRad = document.getElementById('val-rad');
    const elVib = document.getElementById('val-vib');
    const elPress = document.getElementById('val-press');
    const cardTemp = document.getElementById('sensor-temp');
    const cardRad = document.getElementById('sensor-rad');
    const cardVib = document.getElementById('sensor-vib');
    const cardPress = document.getElementById('sensor-press');
    
    const elRisk = document.getElementById('risk-level-badge');
    const elFail = document.getElementById('failure-prob');
    const elMaint = document.getElementById('maintenance-req');
    const elAlertsList = document.getElementById('alerts-list');
    
    const heatmapReactor = document.getElementById('heatmap-reactor');
    const heatmapCooling = document.getElementById('heatmap-cooling');
    const heatmapWaste = document.getElementById('heatmap-waste');
    const systemStatusBadge = document.getElementById('system-status-badge');
    
    let thresholds = {
        temperature: { warning: 320, critical: 390 },
        radiation: { warning: 0.1, critical: 1.0 },
        vibration: { warning: 4.0, critical: 7.0 },
        pressure: { warning_low: 14.5, warning_high: 16.0, critical_low: 14.0, critical_high: 16.5 }
    };

    async function loadThresholds() {
        try {
            const res = await fetch('/api/thresholds');
            const data = await res.json();
            if (data) thresholds = data;
        } catch (e) {
            console.warn('Could not load thresholds from server, using defaults.', e);
        }
    }

    loadThresholds();

    // Robot Elements
    const robotMarker = document.getElementById('robot-marker');
    const robotStatusText = document.getElementById('robot-status-text');
    const robotZoneText = document.getElementById('robot-zone-text');
    
    let currentRobotZone = 'Corridors';
    const robotZones = {
        'Corridors': { top: '80%', left: '20%' },
        'Reactor': { top: '50%', left: '27.5%' },
        'Cooling System': { top: '27.5%', left: '75%' },
        'Waste Storage': { top: '72.5%', left: '75%' }
    };

    function moveRobotTo(zoneName) {
        if (!robotZones[zoneName]) return;
        currentRobotZone = zoneName;
        robotMarker.style.top = robotZones[zoneName].top;
        robotMarker.style.left = robotZones[zoneName].left;
        robotZoneText.textContent = zoneName;
    }

    function updateRobotStatus(newStatus, isEmergency = false) {
        robotStatusText.textContent = newStatus;
        robotStatusText.className = '';
        if (isEmergency) {
            robotStatusText.classList.add('text-danger');
            robotMarker.style.borderColor = 'var(--danger)';
            robotMarker.style.boxShadow = '0 0 15px var(--danger)';
            robotMarker.style.color = 'var(--danger)';
        } else if (newStatus.includes('Inspecting')) {
            robotStatusText.classList.add('text-warning');
            robotMarker.style.borderColor = 'var(--warning)';
            robotMarker.style.boxShadow = '0 0 15px var(--warning)';
            robotMarker.style.color = 'var(--warning)';
        } else {
            robotStatusText.classList.add('text-safe');
            robotMarker.style.borderColor = 'var(--accent)';
            robotMarker.style.boxShadow = '0 0 10px var(--accent)';
            robotMarker.style.color = 'var(--accent)';
        }
    }

    // Main fetch loop from Flask
    async function fetchData() {
        try {
            const res = await fetch('/api/stream');
            const state = await res.json();
            
            const data = state.sensors;
            const analysis = state.analysis;

            // Sensors
            elTemp.textContent = data.temperature.toFixed(1);
            elRad.textContent = data.radiation.toFixed(1);
            elVib.textContent = data.vibration.toFixed(2);
            elPress.textContent = data.pressure.toFixed(1);

            // Charts
            radChart.data.labels.push(state.time);
            radChart.data.datasets[0].data.push(data.radiation);
            if (radChart.data.labels.length > 50) { radChart.data.labels.shift(); radChart.data.datasets[0].data.shift(); }
            radChart.update();

            tempChart.data.labels.push(state.time);
            tempChart.data.datasets[0].data.push(data.temperature);
            if (tempChart.data.labels.length > 50) { tempChart.data.labels.shift(); tempChart.data.datasets[0].data.shift(); }
            tempChart.update();

            // AI Info
            elRisk.textContent = analysis.riskLevel;
            elRisk.className = `risk-badge ${analysis.riskClass}`;
            elFail.textContent = analysis.failureProbability;
            elMaint.textContent = analysis.maintenanceRequired;

            cardTemp.className = `sensor-card ${data.temperature > thresholds.temperature.warning ? (data.temperature > thresholds.temperature.critical ? 'glow-critical' : 'glow-warning') : ''}`;
            cardRad.className = `sensor-card ${data.radiation > thresholds.radiation.warning ? (data.radiation > thresholds.radiation.critical ? 'glow-critical' : 'glow-warning') : ''}`;
            cardVib.className = `sensor-card ${data.vibration > thresholds.vibration.warning ? (data.vibration > thresholds.vibration.critical ? 'glow-critical' : 'glow-warning') : ''}`;
            cardPress.className = `sensor-card ${((data.pressure > thresholds.pressure.warning_high || data.pressure < thresholds.pressure.warning_low) ? ((data.pressure > thresholds.pressure.critical_high || data.pressure < thresholds.pressure.critical_low) ? 'glow-critical' : 'glow-warning') : '')}`;

            heatmapReactor.className = analysis.glowingZones.reactor ? 'heatmap-overlay active-leak' : 'heatmap-overlay';
            heatmapCooling.className = analysis.glowingZones.cooling ? 'heatmap-overlay active-heat' : 'heatmap-overlay';
            heatmapWaste.className = analysis.glowingZones.waste ? 'heatmap-overlay active-leak' : 'heatmap-overlay';

            // Alerts
            elAlertsList.innerHTML = '';
            analysis.alerts.forEach(alert => {
                const li = document.createElement('li');
                li.className = `alert-item ${alert.type}`;
                let icon = 'fa-info-circle';
                if (alert.type === 'warning') icon = 'fa-triangle-exclamation';
                if (alert.type === 'critical') icon = 'fa-skull-crossbones';
                li.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${alert.message}</span> <span class="time">${alert.timestamp}</span>`;
                elAlertsList.appendChild(li);
            });

            if (analysis.riskLevel === 'CRITICAL') {
                systemStatusBadge.innerHTML = `<span class="status-dot danger"></span><span class="status-text text-danger">Emergency</span>`;
            } else if (analysis.riskLevel !== 'LOW') {
                systemStatusBadge.innerHTML = `<span class="status-dot warning"></span><span class="status-text text-warning">Warning</span>`;
            } else {
                systemStatusBadge.innerHTML = `<span class="status-dot safe"></span><span class="status-text">System Normal</span>`;
            }

            // Robot
            if (analysis.riskLevel === 'CRITICAL' || analysis.riskLevel === 'HIGH') {
                if (currentRobotZone !== analysis.targetZone) {
                    updateRobotStatus(`Responding to Emergency`, true);
                    moveRobotTo(analysis.targetZone);
                    setTimeout(() => updateRobotStatus(`Inspecting ${analysis.targetZone}`, false), 2000);
                }
            } else {
                if (currentRobotZone !== 'Corridors') {
                    updateRobotStatus('Returning to Patrol');
                    moveRobotTo('Corridors');
                    setTimeout(() => updateRobotStatus('Patrolling'), 2000);
                }
            }

        } catch (e) {
            console.error('Failed to fetch stream data', e);
        }
    }

    setInterval(fetchData, 1000);

    setInterval(() => {
        document.getElementById('clock').textContent = new Date().toLocaleTimeString();
    }, 1000);

    window.setSensor = function(sensorName, inputId) {
        const val = document.getElementById(inputId).value;
        fetch('/api/set_sensor', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sensor: sensorName, value: val })
        })
        .then(res => res.json())
        .then(data => console.log('Sensor updated:', data));
    };

    window.resetSensors = function() {
        document.getElementById('input-temp').value = '';
        document.getElementById('input-rad').value = '';
        document.getElementById('input-vib').value = '';
        document.getElementById('input-press').value = '';
        
        fetch('/api/scenario/normal', { method: 'POST' })
            .then(res => res.json())
            .then(data => console.log('Sensors reset to normal:', data));
    };
});
