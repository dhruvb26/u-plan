import rasterio
import numpy as np
import json
from pyproj import Transformer
from geopy.geocoders import Nominatim
from shapely.geometry import Point, box
import random

def get_bounding_box(zip_code):
    geolocator = Nominatim(user_agent="uhi_calculator")
    location = geolocator.geocode(zip_code)
    if location and 'boundingbox' in location.raw:
        return location.raw['boundingbox']
    return None

def create_scattered_points(bounding_box, num_points=25):
    if not bounding_box:
        return []
    min_lat, max_lat, min_lon, max_lon = map(float, bounding_box)

    points = []
    for _ in range(num_points):
        lat = random.uniform(float(min_lat), float(max_lat))
        lon = random.uniform(float(min_lon), float(max_lon))
        points.append((lon, lat))  # Note: order is (lon, lat)

    return points

def fetch_and_convert_to_json(ndvi_path, output_json_path, zipcode):
    # Get the bounding box for the zipcode
    bbox = get_bounding_box(zipcode)
    if not bbox:
        raise ValueError(f"No data found for zipcode {zipcode}")

    print(f"Bounding box for {zipcode}: {bbox}")

    # Create scattered points within the bounding box
    scattered_points = create_scattered_points(bbox, num_points=100)
    print(f"Generated {len(scattered_points)} scattered points")

    # Open the NDVI file
    with rasterio.open(ndvi_path) as src:
        ndvi_data = src.read(1)
        transform = src.transform
        crs = src.crs
        print(f"Raster shape: {ndvi_data.shape}")
        print(f"Raster bounds: {src.bounds}")
        print(f"Raster CRS: {crs}")

    # Create a transformer to convert coordinates
    transformer = Transformer.from_crs("EPSG:4326", crs, always_xy=True)

    # Create a list to store our results
    result = []

    # Process scattered points
    for lon, lat in scattered_points:
        # Transform coordinates from lat/long to raster CRS
        x, y = transformer.transform(lon, lat)
        
        # Convert transformed coordinates to raster row/col
        row, col = src.index(x, y)
        
        # Check if the point is within the raster bounds
        if 0 <= row < ndvi_data.shape[0] and 0 <= col < ndvi_data.shape[1]:
            value = ndvi_data[row, col]
            
            # Skip if it's a no-data value (assuming -9999 is no-data)
            if value == -9999:
                continue
            
            # Add to our result list, using None for NaN values
            result.append({
                "coordinates": [lat, lon],
                "ndvi": None if np.isnan(value) else float(value)
            })

    print(f"Found {len(result)} valid data points")

    # Write the result to a JSON file
    with open(output_json_path, 'w') as f:
        json.dump(result, f, allow_nan=False)

    print(f"Conversion complete. Output saved to {output_json_path}")

zipcode = "85281" 
fetch_and_convert_to_json('ndvi.tif', f'data/ndvi_{zipcode}.json', zipcode)