import rasterio
import numpy as np
import folium
import branca.colormap as cm
from pyproj import Transformer
from io import BytesIO
import base64
from PIL import Image
import matplotlib.pyplot as plt

# Define file paths
b3_path = 'phoenix/LC08_L1TP_037037_20240702_20240711_02_T1_B3.TIF'
b4_path = 'phoenix/LC08_L1TP_037037_20240702_20240711_02_T1_B4.TIF'
b5_path = 'phoenix/LC08_L1TP_037037_20240702_20240711_02_T1_B5.TIF'
b6_path = 'phoenix/LC08_L1TP_037037_20240702_20240711_02_T1_B6.TIF'
b10_path = 'phoenix/LC08_L1TP_037037_20240702_20240711_02_T1_B10.TIF'
mtl_file = 'phoenix/LC08_L1TP_037037_20240702_20240711_02_T1_MTL.txt' 

def read_mtl(mtl_file):
    mtl_data = {}
    current_group = mtl_data
    group_stack = []

    with open(mtl_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line.startswith('GROUP = '):
                group_name = line.split('=')[1].strip()
                new_group = {}
                current_group[group_name] = new_group
                group_stack.append(current_group)
                current_group = new_group
            elif line.startswith('END_GROUP'):
                if group_stack:
                    current_group = group_stack.pop()
            elif ' = ' in line:
                key, value = line.split(' = ', 1)
                current_group[key.strip()] = value.strip().strip('"')
            elif line == 'END':
                break

    return mtl_data

mtl_data = read_mtl(mtl_file)

# Determine the root of the MTL data
if 'LANDSAT_METADATA_FILE' in mtl_data:
    mtl_root = mtl_data['LANDSAT_METADATA_FILE']
else:
    mtl_root = mtl_data

# Access the sun elevation
sun_elevation = float(mtl_root['IMAGE_ATTRIBUTES']['SUN_ELEVATION'])

def dn_to_reflectance(dn, band_id):
    mult_key = f'REFLECTANCE_MULT_BAND_{band_id}'
    add_key = f'REFLECTANCE_ADD_BAND_{band_id}'

    rescaling = mtl_root['LEVEL1_RADIOMETRIC_RESCALING']

    M = float(rescaling[mult_key])
    A = float(rescaling[add_key])
    reflectance = M * dn + A
    reflectance = reflectance / np.sin(np.deg2rad(sun_elevation))
    return reflectance

def dn_to_radiance(dn, band_id):
    mult_key = f'RADIANCE_MULT_BAND_{band_id}'
    add_key = f'RADIANCE_ADD_BAND_{band_id}'

    rescaling = mtl_root['LEVEL1_RADIOMETRIC_RESCALING']

    M = float(rescaling[mult_key])
    A = float(rescaling[add_key])
    radiance = M * dn + A
    return radiance

def radiance_to_temperature(radiance, band_id):
    k1_key = f'K1_CONSTANT_BAND_{band_id}'
    k2_key = f'K2_CONSTANT_BAND_{band_id}'

    thermal_constants = mtl_root['LEVEL1_THERMAL_CONSTANTS']

    K1 = float(thermal_constants[k1_key])
    K2 = float(thermal_constants[k2_key])

    temperature = K2 / np.log((K1 / radiance) + 1)
    return temperature

# Read and convert bands
with rasterio.open(b3_path) as src:
    band3_dn = src.read(1).astype('float32')
    profile = src.profile
    band3 = dn_to_reflectance(band3_dn, 3)

with rasterio.open(b4_path) as src:
    band4_dn = src.read(1).astype('float32')
    band4 = dn_to_reflectance(band4_dn, 4)

with rasterio.open(b5_path) as src:
    band5_dn = src.read(1).astype('float32')
    band5 = dn_to_reflectance(band5_dn, 5)

with rasterio.open(b6_path) as src:
    band6_dn = src.read(1).astype('float32')
    band6 = dn_to_reflectance(band6_dn, 6)

# Thermal band
with rasterio.open(b10_path) as src:
    band10_dn = src.read(1).astype('float32')
    thermal_profile = src.profile
    band10_radiance = dn_to_radiance(band10_dn, 10)

# Calculate indices
np.seterr(divide='ignore', invalid='ignore')
ndvi = (band5 - band4) / (band5 + band4)
ndvi = np.nan_to_num(ndvi, nan=-9999)
ndbi = (band6 - band5) / (band6 + band5)
ndbi = np.nan_to_num(ndbi, nan=-9999)
ndwi = (band3 - band5) / (band3 + band5)
ndwi = np.nan_to_num(ndwi, nan=-9999)

# Calculate brightness temperature
brightness_temp = radiance_to_temperature(band10_radiance, 10)

# Estimate emissivity using NDVI
pv = ((ndvi - ndvi.min()) / (ndvi.max() - ndvi.min())) ** 2  # Proportion of vegetation
emissivity = 0.004 * pv + 0.986  # Approximation

# Calculate LST
lst = brightness_temp / (1 + (0.00115 * brightness_temp / 1.4388) * np.log(emissivity))

# Apply NDWI and NDVI thresholding
ndwi_threshold = 0.0  # Water threshold
ndwi_adjusted = np.where(ndwi >= ndwi_threshold, ndwi, np.nan)

ndvi_threshold = 0.2  # Vegetation threshold
ndvi_adjusted = np.where(ndvi >= ndvi_threshold, ndvi, np.nan)

# Modify NDVI colormap to highlight vegetation and barren land
ndvi_colormap = cm.LinearColormap(['brown', 'white', 'green'], vmin=-1, vmax=1)

# Modify NDWI colormap to highlight water, barely any water, and other areas
ndwi_colormap = cm.LinearColormap(['brown', 'white', 'blue'], vmin=-1, vmax=1)

# Save indices
profile.update(dtype=rasterio.float32, count=1, nodata=-9999)
with rasterio.open('ndvi.tif', 'w', **profile) as dst:
    dst.write(ndvi_adjusted.astype(rasterio.float32), 1)
with rasterio.open('ndbi.tif', 'w', **profile) as dst:
    dst.write(ndbi.astype(rasterio.float32), 1)
with rasterio.open('ndwi.tif', 'w', **profile) as dst:
    dst.write(ndwi_adjusted.astype(rasterio.float32), 1)

# Save LST
thermal_profile.update(dtype=rasterio.float32, count=1, nodata=-9999)
with rasterio.open('tst.tif', 'w', **thermal_profile) as dst:
    dst.write(lst.astype(rasterio.float32), 1)

# Define colormaps for LST and NDBI
ndbi_colormap = cm.LinearColormap(['white', 'gray', 'black'], vmin=-1, vmax=1)
lst_vmin = np.nanmin(lst)
lst_vmax = np.nanmax(lst)
lst_colormap = cm.LinearColormap(['blue', 'green', 'red'], vmin=lst_vmin, vmax=lst_vmax)

def show_on_map(raster_path, cmap, layer_name):
    with rasterio.open(raster_path) as src:
        bounds = src.bounds
        image = src.read(1).astype(np.float32)
        image[image == -9999] = np.nan
        crs = src.crs

    # Apply colormap to data
    image = np.ma.masked_invalid(image)
    norm = plt.Normalize(vmin=cmap.vmin, vmax=cmap.vmax)
    
    # Create a matplotlib colormap from the branca colormap
    colors = [cmap.rgb_hex_str(x) for x in np.linspace(0, 1, 256)]
    mpl_cmap = plt.cm.colors.ListedColormap(colors)
    
    rgba = mpl_cmap(norm(image))
    rgba = (rgba * 255).astype(np.uint8)

    # Create a base64-encoded PNG image
    img = Image.fromarray(rgba, mode='RGBA')
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    image_url = 'data:image/png;base64,' + img_str

    # Transform coordinates to WGS84
    transformer = Transformer.from_crs(crs, 'epsg:4326', always_xy=True)
    left, bottom = transformer.transform(bounds.left, bounds.bottom)
    right, top = transformer.transform(bounds.right, bounds.top)
    
    center = [(bottom + top) / 2, (left + right) / 2]
    m = folium.Map(location=center, zoom_start=10)

    folium.raster_layers.ImageOverlay(
        image=image_url,
        bounds=[[bottom, left], [top, right]],
        opacity=0.6,
        name=layer_name,
        origin='upper'
    ).add_to(m)

    cmap.add_to(m)
    folium.LayerControl().add_to(m)
    return m

# Display maps
ndvi_map = show_on_map('ndvi.tif', ndvi_colormap, 'NDVI Adjusted')
ndvi_map.save('output/ndvi_map_adjusted.html')

ndbi_map = show_on_map('ndbi.tif', ndbi_colormap, 'NDBI')
ndbi_map.save('output/ndbi_map_adjusted.html')

ndwi_map_adjusted = show_on_map('ndwi.tif', ndwi_colormap, 'NDWI Adjusted')
ndwi_map_adjusted.save('output/ndwi_map_adjusted.html')

lst_map = show_on_map('tst.tif', lst_colormap, 'LST')
lst_map.save('output/lst_map.html')