"use client";
import React, { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { Feature, Point } from "geojson";
import ReactDOM from "react-dom";
import { Loader2, X, Search } from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MapDock } from "@/components/ui/dock-demo";
import ChatPopup from "@/components/ui/chat-popup";
const ShinyText: React.FC<{ sentences: string[] }> = ({ sentences }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const sentenceInterval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % sentences.length);
    }, 4000); // Change sentence every 3 seconds

    const dotInterval = setInterval(() => {
      setDotCount((prevCount) => (prevCount + 1) % 4);
    }, 1000); // Change dot count every 0.5 seconds

    return () => {
      clearInterval(sentenceInterval);
      clearInterval(dotInterval);
    };
  }, [sentences]);

  return (
    <div className="shiny-text-container bg-white rounded-lg px-4 py-2 text-sm">
      <p
        key={currentIndex}
        className="bg-shine-gradient text-base bg-shine-size animate-shine bg-clip-text text-transparent"
      >
        {sentences[currentIndex]}
        {/* <span className="dots-animation">{".".repeat(dotCount)}</span> */}
      </p>
    </div>
  );
};
const Demo = () => {
  const loadingSentences = [
    "Thinking",
    "Analyzing heat zones",
    "Calculating temperature differences",
    "Preparing data visualization",
  ];
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
  const [isLoading, setIsLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    mapboxgl.accessToken =
      "pk.eyJ1IjoiZGhydXZiMjYiLCJhIjoiY20yNWgzMzc5MHFzdzJxcHB4NXJxOGhwbSJ9.CqsygG9VrHzcvjV3YGeVbg";

    if (mapContainerRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [-71.1167, 42.377], // Harvard SOCH Building coordinates
        zoom: 11,
        attributionControl: false, // Add this line to remove the attribution control
      });

      mapRef.current.on("load", () => {
        setMapLoaded(true);
        setIsLoading(false);
      });
    }

    return () => {
      mapRef.current?.remove();
    };
  }, []);
  const handleZipcodeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Fetch zipcode coordinates
      const geocodingResponse = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${zipcode}.json?access_token=${mapboxgl.accessToken}&types=postcode`
      );
      const geocodingData = await geocodingResponse.json();

      if (geocodingData.features && geocodingData.features.length > 0) {
        const [lng, lat] = geocodingData.features[0].center;
        mapRef.current?.flyTo({
          center: [lng, lat],
          zoom: 12,
        });

        // Fetch UHI data for the entered zipcode
        const uhiResponse = await fetch(
          `http://localhost:3001/uhi?zip_code=${zipcode}`
        );

        if (!uhiResponse.ok) {
          throw new Error(`HTTP error! status: ${uhiResponse.status}`);
        }

        const uhiData = await uhiResponse.json();

        if (!uhiData.uhi_values || !Array.isArray(uhiData.uhi_values)) {
          throw new Error("Invalid data format received from API");
        }

        const points: Feature<Point>[] = uhiData.uhi_values.map(
          ({ coordinates, temperature }: any) => ({
            type: "Feature",
            properties: { temperature },
            geometry: {
              type: "Point",
              coordinates,
            },
          })
        );

        // Add or update the heatmap source and layer
        if (mapRef.current) {
          if (mapRef.current.getSource("heatmap-points")) {
            (
              mapRef.current.getSource(
                "heatmap-points"
              ) as mapboxgl.GeoJSONSource
            ).setData({
              type: "FeatureCollection",
              features: points,
            });
          } else {
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

            // Add click event listener for points
            mapRef.current.on("click", "heatmap-layer", (e) => {
              if (e.lngLat && e.features && e.features[0]) {
                const coordinates = e.lngLat.toArray() as [number, number];
                const temperature = e.features[0].properties?.temperature || 0;
                setClickedPopupInfo({ coordinates, temperature: temperature });
              }
            });

            // Change the cursor to a pointer when the mouse is over the points layer.
            mapRef.current.on("mouseenter", "heatmap-layer", () => {
              if (mapRef.current) {
                mapRef.current.getCanvas().style.cursor = "pointer";
              }
            });

            mapRef.current.on("mouseleave", "heatmap-layer", () => {
              if (mapRef.current) {
                mapRef.current.getCanvas().style.cursor = "";
              }
            });
          }

          setFocusedZipcode(zipcode);
        } else {
          toast.error("Zipcode not found");
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error fetching data");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="absolute inset-0">
      <div
        id="map-container"
        ref={mapContainerRef}
        className="h-full w-full bg-gray-300"
      ></div>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg z-50 bg-white bg-opacity-30">
          {/* <Loader2 className="animate-spin text-white" size={48} /> */}
          <ShinyText sentences={loadingSentences} />
        </div>
      )}
      <div className="absolute left-0 top-0 h-full flex items-start px-4">
        <MapDock />
      </div>

      <div className="absolute mt-4 border  justify-center top-4 items-center right-4 z-10 bg-white p-4 rounded-lg flex flex-row space-x-2">
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
      <div className="absolute bottom-4 right-4 z-20  px-2">
        <ChatPopup />
      </div>
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
