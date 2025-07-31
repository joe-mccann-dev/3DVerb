# 3DVerb

Note: this README is a live document in progress.

## About

- 3DVerb is a VST3 reverb audio plugin made with the JUCE framework.
- 3DVerb utilizes the Juce dsp::Reverb Class as a reference plugin.
- It processes real-time audio data, and passes that data to a JUCE WebView2 UI
- The UI integrates ThreeJS WebGL animation library and the three-nebula library (independent extension for ThreeJS that simplifies certain animations like particle emission).

## Goals

- Proof of concept: audio plugins, enabled by Juce WebView2 for 3D visualizations, can react in real time to real-time data and visualize that data artistically in three dimensions.
- Push for audio plugins to be less utilitarian. Many people utilize their DAW for general music practice and don't necessarily need all their CPU power dedicated to dozens of plugins.
- Provide a relaxing virtual environment for users to visualize their music in real time.
- Practical uses:
    - View how reverb parameters affect frequency distribution in real-time--useful for mixing as reverb can saturate low or high frequencies depending on parameter settings.

## Installation

### Requirements
- Vite
- three-nebula
- Juce Projucer
- A system with WebView2 installed. 