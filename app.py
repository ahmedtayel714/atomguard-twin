from flask import Flask, render_template, jsonify, request
import time
import random
from datetime import datetime

app = Flask(__name__)

# --- AI Logic Engine ---
class AILogicEngine:
    def __init__(self):
        self.thresholds = {
            'temperature': {'warning': 315, 'critical': 350},
            'radiation': {'warning': 0.1, 'critical': 1.0},
            'vibration': {'warning': 4.0, 'critical': 7.0},
            'pressure': {'warning_low': 14.5, 'warning_high': 16.0, 'critical_low': 14.0, 'critical_high': 16.5}
        }
        self.active_alerts = set()
        self.alert_history = []
        self.last_clear_time = time.time()

    def add_alert(self, msg, alert_type):
        current_time = time.time()
        # Clear active alerts every 10 seconds to allow re-trigger
        if current_time - self.last_clear_time > 10:
            self.active_alerts.clear()
            self.last_clear_time = current_time

        if msg not in self.active_alerts:
            new_alert = {'message': msg, 'type': alert_type, 'timestamp': datetime.now().strftime('%H:%M:%S')}
            self.alert_history.insert(0, new_alert)
            self.active_alerts.add(msg)
            # Keep only last 10 alerts
            if len(self.alert_history) > 10:
                self.alert_history = self.alert_history[:10]

    def analyze(self, data):
        risk_score = 0
        is_maintenance_req = False
        target_zone = 'Corridors'
        glowing_zones = {'reactor': False, 'cooling': False, 'waste': False}

        # 1. Radiation
        if data['radiation'] > self.thresholds['radiation']['critical']:
            risk_score += 3
            target_zone = 'Reactor'
            glowing_zones['reactor'] = True
            self.add_alert('Critical radiation leak detected in Reactor Core!', 'critical')
        elif data['radiation'] > self.thresholds['radiation']['warning']:
            risk_score += 1
            target_zone = 'Waste Storage'
            glowing_zones['waste'] = True
            self.add_alert('Elevated radiation levels observed.', 'warning')

        # 2. Temperature
        if data['temperature'] > self.thresholds['temperature']['critical']:
            risk_score += 3
            target_zone = 'Cooling System'
            glowing_zones['cooling'] = True
            self.add_alert('Cooling system critical overheating!', 'critical')
            is_maintenance_req = True
        elif data['temperature'] > self.thresholds['temperature']['warning']:
            risk_score += 1
            target_zone = 'Cooling System'
            glowing_zones['cooling'] = True
            self.add_alert('Temperature rising in cooling infrastructure.', 'warning')

        # 3. Pressure
        if data['pressure'] > self.thresholds['pressure']['critical_high'] or data['pressure'] < self.thresholds['pressure']['critical_low']:
            risk_score += 3
            target_zone = 'Reactor'
            glowing_zones['reactor'] = True
            self.add_alert('Critical pressure anomaly detected!', 'critical')
            is_maintenance_req = True
        elif data['pressure'] > self.thresholds['pressure']['warning_high'] or data['pressure'] < self.thresholds['pressure']['warning_low']:
            risk_score += 1
            self.add_alert('Abnormal pressure levels detected.', 'warning')

        # 3. Vibration
        if data['vibration'] > self.thresholds['vibration']['critical']:
            risk_score += 3
            target_zone = 'Cooling System'
            glowing_zones['cooling'] = True
            self.add_alert('Severe structural vibration detected! Imminent failure risk.', 'critical')
            is_maintenance_req = True
        elif data['vibration'] > self.thresholds['vibration']['warning']:
            risk_score += 1
            self.add_alert('Abnormal vibration patterns detected.', 'warning')

        # Determine Risk Level
        risk_level = 'LOW'
        risk_class = 'low'
        prob = (risk_score * 12.5) + (random.random() * 2)

        if risk_score >= 4:
            risk_level = 'CRITICAL'
            risk_class = 'high'
            prob = max(prob, 85)
        elif risk_score >= 2:
            risk_level = 'HIGH'
            risk_class = 'high'
        elif risk_score >= 1:
            risk_level = 'MEDIUM'
            risk_class = 'medium'
        else:
            prob = max(0.1, prob)

        return {
            'riskLevel': risk_level,
            'riskClass': risk_class,
            'failureProbability': f"{min(99.9, prob):.1f}%",
            'maintenanceRequired': 'Yes (Immediate)' if is_maintenance_req else 'No',
            'alerts': self.alert_history,
            'targetZone': target_zone,
            'glowingZones': glowing_zones
        }

import csv
import os

# --- Data Generator ---
class DataGenerator:
    def __init__(self):
        self.baseline = {
            'temperature': 290,
            'radiation': 0.01,
            'vibration': 1.0,
            'pressure': 15.26
        }
        self.scenario = 'normal'
        self.override = {}
        self.ai = AILogicEngine()
        
        self.csv_file = 'data.csv'
        self.data_rows = []
        self.current_idx = 0
        
        if os.path.exists(self.csv_file):
            with open(self.csv_file, mode='r') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    self.data_rows.append(row)
        else:
            print(f"Warning: {self.csv_file} not found. Generating dummy data.")
            self.data_rows = [{'temperature': 300, 'radiation': 0.02, 'vibration': 2.5, 'pressure': 15.5}]

    def set_scenario(self, scenario_name):
        self.scenario = scenario_name
        self.override.clear()

    def generate_state(self):
        if not self.data_rows:
            return {}

        # Get current row from CSV
        row = self.data_rows[self.current_idx]
        
        # Advance index and loop back if needed
        self.current_idx = (self.current_idx + 1) % len(self.data_rows)

        # Parse CSV values
        csv_temp = float(row.get('temperature', self.baseline['temperature']))
        csv_rad = float(row.get('radiation', self.baseline['radiation']))
        csv_vib = float(row.get('vibration', self.baseline['vibration']))
        csv_press = float(row.get('pressure', self.baseline['pressure']))
        anomaly_flag = int(float(row.get('anomaly', 0))) if row.get('anomaly', '') != '' else 0

        # When the system is in normal mode, force safe baseline values for any anomaly rows.
        if self.scenario == 'normal' and anomaly_flag == 1:
            csv_temp = self.baseline['temperature']
            csv_rad = self.baseline['radiation']
            csv_vib = self.baseline['vibration']
            csv_press = self.baseline['pressure']

        data = {
            'temperature': self.override.get('temperature', csv_temp),
            'radiation': self.override.get('radiation', csv_rad),
            'vibration': self.override.get('vibration', csv_vib),
            'pressure': self.override.get('pressure', csv_press)
        }

        # Apply manual scenario values when a scenario is active.
        if self.scenario == 'radiation':
            data['radiation'] = self.override.get('radiation', max(csv_rad, 5.0))
        elif self.scenario == 'temperature':
            data['temperature'] = self.override.get('temperature', max(csv_temp, 330.0))
        elif self.scenario == 'vibration':
            data['vibration'] = self.override.get('vibration', max(csv_vib, 6.0))

        # Analyze data
        analysis = self.ai.analyze(data)

        # Build full state payload
        state = {
            'sensors': data,
            'analysis': analysis,
            'time': datetime.now().strftime('%H:%M:%S')
        }
        return state

generator = DataGenerator()

# --- Routes ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/stream')
def stream():
    return jsonify(generator.generate_state())

@app.route('/api/thresholds')
def get_thresholds():
    return jsonify(generator.ai.thresholds)

@app.route('/api/scenario/<scenario_name>', methods=['POST'])
def trigger_scenario(scenario_name):
    if scenario_name in ['normal', 'radiation', 'temperature', 'vibration']:
        generator.set_scenario(scenario_name)
        return jsonify({'status': 'success', 'scenario': scenario_name})
    return jsonify({'error': 'Invalid scenario'}), 400

@app.route('/api/set_sensor', methods=['POST'])
def set_sensor():
    req = request.json
    sensor = req.get('sensor')
    value = req.get('value')
    if sensor in generator.baseline:
        if value is None or str(value).strip() == '':
            generator.override.pop(sensor, None)
        else:
            try:
                generator.override[sensor] = float(value)
            except ValueError:
                return jsonify({'error': 'Invalid value'}), 400
        return jsonify({'status': 'success'})
    return jsonify({'error': 'Invalid sensor'}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)
