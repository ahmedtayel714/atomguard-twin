import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Configuration
NUM_ROWS = 100000
START_TIME = datetime(2025, 1, 1, 0, 0, 0)
OUTPUT_FILE = 'data.csv'

# Generate timestamps
timestamps = [START_TIME + timedelta(minutes=i) for i in range(NUM_ROWS)]

# Generate Anomaly Flags (default 0% anomaly rate so app starts smoothly)
# Set ANOMALY_RATE = 0.05 to include a small percentage of anomalies.
ANOMALY_RATE = 0.0
np.random.seed(42)
anomalies = np.random.choice([0, 1], size=NUM_ROWS, p=[1.0 - ANOMALY_RATE, ANOMALY_RATE])

# Initialize arrays
temperatures = np.zeros(NUM_ROWS)
radiations = np.zeros(NUM_ROWS)
gases = np.zeros(NUM_ROWS)
vibrations = np.zeros(NUM_ROWS)
pressures = np.zeros(NUM_ROWS)
energy_consumptions = np.zeros(NUM_ROWS)

for i in range(NUM_ROWS):
    is_anomaly = anomalies[i] == 1
    
    if not is_anomaly:
        # Normal Nuclear Power Plant Ranges
        temperatures[i] = np.random.uniform(290, 315) # Reactor Coolant Temp °C
        radiations[i] = np.random.uniform(0.01, 0.09) # Radiation mSv/h
        gases[i] = np.random.uniform(0.01, 0.025)        # Hydrogen Gas Concentration %
        vibrations[i] = np.random.uniform(1.0, 3.5)   # Turbine/Pump Vibration mm/s
        pressures[i] = np.random.uniform(15.2, 15.8)  # Primary Coolant Pressure MPa
        energy_consumptions[i] = np.random.uniform(35, 45) # Auxiliary Power MW
    else:
        # Anomaly Ranges (spikes or drops)
        anomaly_type = np.random.choice(['high_temp', 'radiation_leak', 'gas_leak', 'high_vibration', 'pressure_drop'])
        
        # Base normal values
        temperatures[i] = np.random.uniform(290, 315)
        radiations[i] = np.random.uniform(0.01, 0.09)
        gases[i] = np.random.uniform(0.0, 0.2)
        vibrations[i] = np.random.uniform(1.0, 3.5)
        pressures[i] = np.random.uniform(13.2, 13.9)
        energy_consumptions[i] = np.random.uniform(35, 45)
        
        # Apply specific anomaly
        # if anomaly_type == 'high_temp':
        #     temperatures[i] = np.random.uniform(325, 360) # Overheating
        #     pressures[i] = np.random.uniform(16.0, 17.5)  # Pressure rises with temp
        # elif anomaly_type == 'radiation_leak':
        #     radiations[i] = np.random.uniform(0.5, 50.0)  # Significant radiation spike
        # elif anomaly_type == 'gas_leak':
        #     gases[i] = np.random.uniform(1.0, 4.0)        # High hydrogen
        # elif anomaly_type == 'high_vibration':
        #     vibrations[i] = np.random.uniform(5.0, 12.0)  # Severe vibration
        #     energy_consumptions[i] = np.random.uniform(45, 60) # Power surge due to mechanical stress
        # elif anomaly_type == 'pressure_drop':
        #     pressures[i] = np.random.uniform(10.0, 14.0)  # Loss of coolant accident (LOCA) scenario
        #     temperatures[i] = np.random.uniform(320, 350) # Core heats up due to lost pressure

# Create DataFrame
df = pd.DataFrame({
    'timestamp': timestamps,
    'temperature': np.round(temperatures, 2),
    'radiation': np.round(radiations, 4),
    'gas': np.round(gases, 2),
    'vibration': np.round(vibrations, 2),
    'pressure': np.round(pressures, 2),
    'energy_consumption': np.round(energy_consumptions, 2),
    'anomaly': anomalies
})

# Save to CSV
df.to_csv(OUTPUT_FILE, index=False)
print(f"Generated {NUM_ROWS} rows of nuclear power grade data and saved to {OUTPUT_FILE}")
