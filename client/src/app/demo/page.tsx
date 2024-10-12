"use client";
import React, { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { Feature, Point } from "geojson";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MapDock } from "@/components/ui/dock-demo";
import { Search } from "lucide-react";
const Demo = () => {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [zipcode, setZipcode] = useState("");
  const [popupInfo, setPopupInfo] = useState<{
    coordinates: [number, number];
    temperature: number;
  } | null>(null);
  const [focusedZipcode, setFocusedZipcode] = useState<string | null>(null);
  const [clickedPopupInfo, setClickedPopupInfo] = useState<{
    coordinates: [number, number];
    temperature: number;
  } | null>(null);

  useEffect(() => {
    mapboxgl.accessToken =
      "pk.eyJ1IjoiZGhydXZiMjYiLCJhIjoiY20yNWgzMzc5MHFzdzJxcHB4NXJxOGhwbSJ9.CqsygG9VrHzcvjV3YGeVbg";

    if (mapContainerRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [-111.94, 33.4484], // Tempe coordinates
        zoom: 11,
      });

      mapRef.current.on("load", () => {
        // Generate points based on the image
        const points: Feature<Point>[] = [
          { coordinates: [-111.9623, 33.4733], temperature: 0.8 },
          { coordinates: [-111.9357, 33.4786], temperature: 1 },
          { coordinates: [-111.9031, 33.48], temperature: 0.6 },
          { coordinates: [-111.9695, 33.4438], temperature: 0.4 },
          { coordinates: [-111.9363, 33.4527], temperature: 0.7 },
          { coordinates: [-111.9706, 33.4229], temperature: 0.9 },
          { coordinates: [-111.9513, 33.4145], temperature: 1 },
          { coordinates: [-111.8926, 33.4365], temperature: 0.5 },
          { coordinates: [-111.9256, 33.4179], temperature: 0.8 },
          { coordinates: [-111.8991, 33.439], temperature: 0.7 },
          { coordinates: [-111.952, 33.4057], temperature: 1 },
          { coordinates: [-111.9196, 33.4073], temperature: 0.9 },
          { coordinates: [-111.8984, 33.3976], temperature: 0.8 },
          { coordinates: [-111.8975, 33.416], temperature: 0.6 },
          { coordinates: [-111.9373, 33.3948], temperature: 1 },
          { coordinates: [-111.9001, 33.3806], temperature: 0.9 },
          { coordinates: [-111.9749, 33.3913], temperature: 0.7 },
          { coordinates: [-111.9423, 33.3726], temperature: 0.8 },
          { coordinates: [-111.8978, 33.3728], temperature: 1 },
          { coordinates: [-111.9625, 33.3738], temperature: 0.9 },
        ].map(({ coordinates, temperature }) => ({
          type: "Feature",
          properties: { temperature },
          geometry: {
            type: "Point",
            coordinates,
          },
        }));

        mapRef.current?.addSource("heatmap-points", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: points,
          },
        });

        mapRef.current?.addLayer({
          id: "heatmap-layer",
          type: "heatmap",
          source: "heatmap-points",
          paint: {
            "heatmap-weight": [
              "interpolate",
              ["linear"],
              ["get", "temperature"],
              0,
              0,
              1,
              1,
            ],
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              1,
              9,
              3,
            ],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(33,102,172,0)",
              0.2,
              "rgb(103,169,207)",
              0.4,
              "rgb(209,229,240)",
              0.6,
              "rgb(253,219,199)",
              0.8,
              "rgb(239,138,98)",
              1,
              "rgb(178,24,43)",
            ],
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              2,
              9,
              20,
            ],
            "heatmap-opacity": 0.8,
          },
        });

        // Add source for zipcode boundary
        mapRef.current?.addSource("zipcode-boundary", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [],
            },
            properties: {},
          },
        });

        // // Add layer for zipcode boundary
        // mapRef.current?.addLayer({
        //   id: "zipcode-boundary-layer",
        //   type: "line",
        //   source: "zipcode-boundary",
        //   paint: {
        //     "line-color": "#000",
        //     "line-width": 2,
        //   },
        // });

        // Add click event listener for pointscdx
        mapRef.current?.on("click", "heatmap-layer", (e) => {
          if (e.lngLat && e.features && e.features[0]) {
            const coordinates = e.lngLat.toArray() as [number, number];
            const temperature = e.features[0].properties?.temperature || 0;
            setClickedPopupInfo({ coordinates, temperature: temperature });
          }
        });

        // Change the cursor to a pointer when the mouse is over the points layer.
        mapRef.current?.on("mouseenter", "heatmap-layer", () => {
          if (mapRef.current) {
            mapRef.current.getCanvas().style.cursor = "pointer";
          }
        });

        // Change it back to a pointer when it leaves.
        mapRef.current?.on("mouseleave", "heatmap-layer", () => {
          if (mapRef.current) {
            mapRef.current.getCanvas().style.cursor = "";
          }
        });
      });
    }

    return () => {
      mapRef.current?.remove();
    };
  }, []);

  const handleZipcodeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${zipcode}.json?access_token=${mapboxgl.accessToken}&types=postcode`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        const bbox = data.features[0].bbox;

        mapRef.current?.flyTo({
          center: [lng, lat],
          zoom: 12,
        });

        // Update the zipcode boundary
        if (mapRef.current) {
          const source = mapRef.current.getSource(
            "zipcode-boundary"
          ) as mapboxgl.GeoJSONSource;
          source.setData({
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [bbox[0], bbox[1]],
                  [bbox[2], bbox[1]],
                  [bbox[2], bbox[3]],
                  [bbox[0], bbox[3]],
                  [bbox[0], bbox[1]],
                ],
              ],
            },
          });
        }

        setFocusedZipcode(zipcode);
      } else {
        toast.error("Zipcode not found");
      }
    } catch (error) {
      console.error("Error fetching zipcode coordinates:", error);
      toast.error("Error fetching zipcode coordinates");
    }
  };

  return (
    <main className="absolute inset-0">
      <div
        id="map-container"
        ref={mapContainerRef}
        className="h-full w-full bg-gray-300"
      ></div>
      <div className="absolute left-0 top-0 h-full flex items-start px-4">
        <MapDock />
      </div>

      <div className="absolute mt-4 border border-white justify-center top-4 items-center right-4 z-10 bg-white p-4 rounded-lg bg-opacity-0 flex flex-row space-x-2">
        <form
          onSubmit={handleZipcodeSubmit}
          className="flex flex-row space-x-2"
        >
          <Input
            type="text"
            value={zipcode}
            onChange={(e) => setZipcode(e.target.value)}
            placeholder="Enter zipcode"
          />
          <Button type="submit">
            <Search className="size-4 mr-1 text-white" />
            Search
          </Button>
        </form>
      </div>

      {popupInfo && (
        <CustomPopup
          mapRef={mapRef}
          longitude={clickedPopupInfo?.coordinates[0] ?? 0}
          latitude={clickedPopupInfo?.coordinates[1] ?? 0}
          onClose={() => setPopupInfo(null)}
        />
      )}
      {clickedPopupInfo && (
        <CustomPopup
          mapRef={mapRef}
          longitude={clickedPopupInfo.coordinates[0]}
          latitude={clickedPopupInfo.coordinates[1]}
          onClose={() => setClickedPopupInfo(null)}
        />
      )}
    </main>
  );
};

interface CustomPopupProps {
  mapRef: React.RefObject<mapboxgl.Map | undefined>;
  longitude: number;
  latitude: number;
  onClose: () => void;
}

const CustomPopup: React.FC<CustomPopupProps> = ({
  mapRef,
  longitude,
  latitude,
  onClose,
}) => {
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [popupElement] = useState(() => {
    const div = document.createElement("div");
    // Apply custom styles to the div
    div.className = "custom-popup-content"; // Add a class to the inner content div

    return div;
  });
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);

  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current;

      // Mock data for the neighborhood
      const neighborhoodData = {
        publicAssistance: "High",
        belowPoverty: "Moderate",
        wildfireRisk: "High",
        stormSurgeRisk: "Low",
        homesAtRisk: 650,
        propertyValueExposed: "$225M",
      };

      ReactDOM.render(
        <div className="custom-popup-content">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-base font-semibold tracking-tight">
              Neighborhood
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <section>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">
                People & Vulnerabilities
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs">
                    % Eligible for Public Assistance
                  </span>
                  <span className="text-xs font-semibold text-red-500">
                    {neighborhoodData.publicAssistance}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs">% Below Poverty</span>
                  <span className="text-xs font-semibold text-yellow-500">
                    {neighborhoodData.belowPoverty}
                  </span>
                </div>
              </div>
            </section>

            <section>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">
                Climate & Hazards
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs">Wildfire Risk</span>
                  <span className="text-xs font-semibold text-red-500">
                    {neighborhoodData.wildfireRisk}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs">Storm Surge Risk</span>
                  <span className="text-xs font-semibold text-green-500">
                    {neighborhoodData.stormSurgeRisk}
                  </span>
                </div>
              </div>
            </section>

            <section>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">
                Built Environment
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs">Homes at Risk</span>
                  <span className="text-xs font-semibold">
                    {neighborhoodData.homesAtRisk}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs">Property Value Exposed</span>
                  <span className="text-xs font-semibold">
                    {neighborhoodData.propertyValueExposed}
                  </span>
                </div>
              </div>
            </section>
          </div>
          <Button
            className="w-full mt-4"
            size={"sm"}
            onClick={() => setIsDetailsPanelOpen(true)}
          >
            Learn more
          </Button>
        </div>,
        popupElement
      );

      popupRef.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "custom-mapboxgl-popup", // Add a custom class to the Mapbox popup container
      })
        .setLngLat([longitude, latitude])
        .setDOMContent(popupElement)
        .addTo(map);
    }

    return () => {
      if (popupRef.current) {
        popupRef.current.remove();
      }
      ReactDOM.unmountComponentAtNode(popupElement);
    };
  }, [mapRef, longitude, latitude, onClose]);

  return null;
};

export default Demo;
