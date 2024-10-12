import numpy as np
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
import folium
from folium.plugins import HeatMap
from flask import Flask, jsonify, request
import requests
import random
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def get_coordinates(zip_code):
    geolocator = Nominatim(user_agent="uhi_calculator")
    location = geolocator.geocode(zip_code)
    if location:
        return location.latitude, location.longitude
    return None

def get_bounding_box(zip_code):
    geolocator = Nominatim(user_agent="uhi_calculator")
    location = geolocator.geocode(zip_code)
    if location and 'boundingbox' in location.raw:
        return location.raw['boundingbox']
    return None

def create_grid(bounding_box, grid_size=5):
    if not bounding_box:
        return []
    min_lat, max_lat, min_lon, max_lon = map(float, bounding_box)
    lat_step = (max_lat - min_lat) / grid_size
    lon_step = (max_lon - min_lon) / grid_size
    
    grid = []
    for i in range(grid_size):
        for j in range(grid_size):
            lat = min_lat + i * lat_step + lat_step / 2
            lon = min_lon + j * lon_step + lon_step / 2
            grid.append((lat, lon))
    
    return grid

def get_nearby_stations(lat, lon, radius_km=50):
    url = f"https://api.weather.gov/points/{lat},{lon}/stations"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as e:
        print(f"Error fetching nearby stations: {e}")
        return []
    
    stations = []
    for station in data.get('features', []):
        station_lat = station['geometry']['coordinates'][1]
        station_lon = station['geometry']['coordinates'][0]
        distance = geodesic((lat, lon), (station_lat, station_lon)).km
        if distance <= radius_km:
            stations.append({
                'id': station['properties']['stationIdentifier'],
                'name': station['properties']['name'],
                'distance': distance
            })
    
    return sorted(stations, key=lambda x: x['distance'])

def get_temperature(station_id):
    url = f"https://api.weather.gov/stations/{station_id}/observations/latest"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        return data['properties']['temperature']['value']
    except requests.RequestException as e:
        print(f"Error fetching temperature for station {station_id}: {e}")
        return None

def calculate_uhi(lat, lon):
    stations = get_nearby_stations(lat, lon)
    
    if len(stations) < 2:
        return None
    
    temperatures = [get_temperature(station['id']) for station in stations[:5]]  # Get temperatures for up to 5 nearest stations
    temperatures = [temp for temp in temperatures if temp is not None]
    
    if len(temperatures) < 2:
        return None
    
    urban_temp = temperatures[0]  # Assuming the closest station is urban
    rural_temp = np.mean(temperatures[1:])  # Average of other stations as rural reference
    
    uhi = urban_temp - rural_temp
    
    return uhi


def create_heatmap(zip_code, uhi_values):
    if not uhi_values:
        print(f"No UHI values to plot for {zip_code}")
        return None

    center_lat = sum(point[0] for point in uhi_values) / len(uhi_values)
    center_lon = sum(point[1] for point in uhi_values) / len(uhi_values)

    m = folium.Map(location=[center_lat, center_lon], zoom_start=13)
    HeatMap(uhi_values).add_to(m)
    return m

def create_scattered_points(bounding_box, num_points=25):
    if not bounding_box:
        return []
    min_lat, max_lat, min_lon, max_lon = map(float, bounding_box)
    
    points = []
    for _ in range(num_points):
        lat = random.uniform(min_lat, max_lat)
        lon = random.uniform(min_lon, max_lon)
        points.append((lat, lon))
    
    return points

def calculate_uhi_scattered(zip_code):
    bounding_box = get_bounding_box(zip_code)
    if not bounding_box:
        print(f"Could not find bounding box for zip code {zip_code}")
        return []
    
    points = create_scattered_points(bounding_box)
    
    uhi_values = []
    for lat, lon in points:
        uhi = calculate_uhi(lat, lon)
        if uhi is not None:
            uhi_values.append([lat, lon, uhi])
    
    return uhi_values

def get_formatted_uhi_values(zip_code):
    uhi_values = calculate_uhi_scattered(zip_code)
    
    if not uhi_values:
        return []
    
    
    formatted_uhi_values = [
        {"coordinates": [round(lon, 2), round(lat, 2)], "temperature": round(uhi, 2)}
        for lat, lon, uhi in uhi_values
    ]
    
    # Create and save the heatmap
    heatmap = create_heatmap(zip_code, uhi_values)
    # if heatmap:
    #     heatmap.save(f"uhi_heatmap_{zip_code}.html")
    
    return formatted_uhi_values

@app.route('/uhi', methods=['GET'])
def get_uhi():
    zip_code = request.args.get('zip_code')
    if not zip_code:
        return jsonify({"error": "Missing zip_code parameter"}), 400
    
    uhi_values = get_formatted_uhi_values(zip_code)
    
    if not uhi_values:
        return jsonify({"error": f"Could not calculate UHI values for {zip_code}"}), 404
    
    return jsonify({"uhi_values": uhi_values})

if __name__ == "__main__":
    app.run(debug=True, port=3001) 