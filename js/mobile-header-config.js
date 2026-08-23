/* RiverWatch Mobile Header Config
   Exported from Scene-Lab. Replace js/mobile-header-config.js in the main page. */
window.RIVERWATCH_MOBILE_HEADER_CONFIG = {
  "version": 1,
  "header": {
    "height": 140
  },
  "boat": {
    "x": 80,
    "y": 12,
    "scale": 0.55,
    "zIndex": 30,
    "baseWidthRatio": 0.37,
    "originX": 50,
    "originY": 82,
    "animation": {
      "floatY": 10,
      "driftX": 5,
      "pitch": 2,
      "duration": 3,
      "easing": "ease-in-out"
    }
  },
  "frontWave": {
    "x": 80,
    "y": 35,
    "scale": 1,
    "zIndex": 40,
    "baseWidthRatio": 1,
    "animation": {
      "driftX": 15,
      "floatY": 2,
      "scalePulse": 0.01,
      "duration": 5,
      "easing": "ease-in-out"
    }
  },
  "rearWave": {
    "x": 0,
    "y": 3,
    "scale": 1.6,
    "zIndex": 20,
    "baseWidthRatio": 1,
    "animation": {
      "driftX": 8,
      "floatY": 1,
      "scalePulse": 0.005,
      "duration": 7,
      "easing": "ease-in-out"
    }
  },
  "commonUI": {
    "x": 0,
    "y": 6,
    "scale": 1,
    "zIndex": 60,
    "symbol": {
      "x": 9,
      "y": 4,
      "size": 38
    },
    "brand": {
      "x": 7
    },
    "sync": {
      "x": 27,
      "y": 48
    },
    "retry": {
      "x": 178,
      "y": 42
    }
  },
  "trend": {
    "composition": {
      "STRONG_DOWN": [
        "darkCloud",
        "rain",
        "lightning"
      ],
      "DOWN": [
        "darkCloud",
        "rain"
      ],
      "STABLE": [
        "darkCloud"
      ],
      "UP": [
        "cloud"
      ],
      "STRONG_UP": [
        "birds"
      ]
    },
    "layers": {
      "darkCloud": {
        "x": -4,
        "y": -1,
        "scale": 0.55,
        "zIndex": 5,
        "opacity": 0.55,
        "duration": 8,
        "driftX": 4,
        "floatY": 1
      },
      "rain": {
        "x": 0,
        "y": 0,
        "scale": 0.8,
        "zIndex": 49,
        "opacity": 0.55,
        "duration": 5,
        "driftX": 2,
        "floatY": 10
      },
      "lightning": {
        "x": 0,
        "y": 0,
        "scale": 0.55,
        "zIndex": 50,
        "opacity": 0.75,
        "duration": 1,
        "driftX": 0,
        "floatY": 0
      },
      "cloud": {
        "x": -5,
        "y": -1,
        "scale": 0.55,
        "zIndex": 5,
        "opacity": 0.55,
        "duration": 10,
        "driftX": 5,
        "floatY": 1
      },
      "birds": {
        "x": 5,
        "y": 15,
        "scale": 0.2,
        "zIndex": 50,
        "opacity": 0.8,
        "duration": 3,
        "driftX": 20,
        "floatY": 5
      }
    }
  }
};
