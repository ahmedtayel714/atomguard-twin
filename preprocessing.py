
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

data = pd.read_csv('data.csv')

plt.plot(data.humidity, data.radiation_level, 'o')
plt.xlabel('humidity')
plt.ylabel('radiation_level')
plt.title('Distribution of Radiation Level vs Humidity')
plt.show()