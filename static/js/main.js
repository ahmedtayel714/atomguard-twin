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
    const elHumidity = document.getElementById('val-humidity');
    const elPress = document.getElementById('val-press');
    const cardTemp = document.getElementById('sensor-temp');
    const cardRad = document.getElementById('sensor-rad');
    const cardHumidity = document.getElementById('sensor-humidity');
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
        temperature: { warning: 315, critical: 350 },
        radiation: { warning: 1.5, critical: 5.0 },
        humidity: { warning: 65.0, critical: 75.0 },
        pressure: { warning: 115.0, critical: 125.0 }
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
        } else if (newStatus.includes('Inspecting') || newStatus.includes('Warning') || newStatus.includes('Responding')) {
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
            elRad.textContent = data.radiation.toFixed(2);
            elHumidity.textContent = data.humidity.toFixed(1);
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
            cardHumidity.className = `sensor-card ${data.humidity > thresholds.humidity.warning ? (data.humidity > thresholds.humidity.critical ? 'glow-critical' : 'glow-warning') : ''}`;
            cardPress.className = `sensor-card ${data.pressure > thresholds.pressure.warning ? (data.pressure > thresholds.pressure.critical ? 'glow-critical' : 'glow-warning') : ''}`;

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

            // Robot behavior: Navigate only on warning; Evacuate/Standby on critical
            if (analysis.hasCritical) {
                if (currentRobotZone !== 'Corridors') {
                    updateRobotStatus('Evacuating to Safe Zone', true);
                    moveRobotTo('Corridors');
                    setTimeout(() => updateRobotStatus('Standby (Critical Hazard)', true), 2000);
                } else {
                    // Stay in Safe Zone but warn
                    if (robotStatusText.textContent !== 'Standby (Critical Hazard)' && !robotStatusText.textContent.includes('Evacuating')) {
                        updateRobotStatus('Standby (Critical Hazard)', true);
                    }
                }
            } else if (analysis.hasWarning) {
                if (currentRobotZone !== analysis.targetZone) {
                    updateRobotStatus(`Responding to Warning`, false);
                    moveRobotTo(analysis.targetZone);
                    setTimeout(() => updateRobotStatus(`Inspecting ${analysis.targetZone}`, false), 2000);
                } else {
                    if (!robotStatusText.textContent.includes('Responding') && !robotStatusText.textContent.includes('Inspecting')) {
                        updateRobotStatus(`Inspecting ${analysis.targetZone}`, false);
                    }
                }
            } else {
                if (currentRobotZone !== 'Corridors') {
                    updateRobotStatus('Returning to Patrol');
                    moveRobotTo('Corridors');
                    setTimeout(() => updateRobotStatus('Patrolling'), 2000);
                } else {
                    if (robotStatusText.textContent !== 'Patrolling' && !robotStatusText.textContent.includes('Returning')) {
                        updateRobotStatus('Patrolling');
                    }
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

    const ALERT_RANGES = {
        temperature: {
            warning: [316.0, 349.0],
            critical: [351.0, 380.0]
        },
        radiation: {
            warning: [1.6, 4.9],
            critical: [5.1, 15.0]
        },
        humidity: {
            warning: [66.0, 74.0],
            critical: [76.0, 95.0]
        },
        pressure: {
            warning: [116.0, 124.0],
            critical: [126.0, 145.0]
        }
    };

    window.triggerAlert = function(sensorName, alertType) {
        const range = ALERT_RANGES[sensorName]?.[alertType];
        if (!range) {
            console.error(`Invalid sensor or alert type: ${sensorName}, ${alertType}`);
            return;
        }

        const [min, max] = range;
        const randomVal = Math.random() * (max - min) + min;
        
        // 2 decimals for radiation, 1 decimal for others
        const decimals = (sensorName === 'radiation') ? 2 : 1;
        const val = parseFloat(randomVal.toFixed(decimals));

        console.log(`Triggering override for ${sensorName} (${alertType}): generated value = ${val}`);

        fetch('/api/set_sensor', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sensor: sensorName, value: val })
        })
        .then(res => res.json())
        .then(data => console.log('Sensor override successful:', data))
        .catch(err => console.error('Failed to override sensor:', err));
    };

    window.resetSensors = function() {
        console.log('Resetting all sensor overrides...');
        fetch('/api/scenario/normal', { method: 'POST' })
            .then(res => res.json())
            .then(data => console.log('Sensors reset to normal baseline:', data))
            .catch(err => console.error('Failed to reset sensors:', err));
    };
});
