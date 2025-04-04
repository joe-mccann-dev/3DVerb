/*
  ==============================================================================

	This file contains the basic framework code for a JUCE plugin editor.

  ==============================================================================
*/

#pragma once

#include <JuceHeader.h>
#include "PluginProcessor.h"

//==============================================================================
/**
*/

namespace webview_plugin
{
	class ReverbulizerAudioProcessorEditor : public juce::AudioProcessorEditor,
		private juce::Timer
	{
	public:
		ReverbulizerAudioProcessorEditor(ReverbulizerAudioProcessor&, juce::UndoManager& um);
		~ReverbulizerAudioProcessorEditor() override;

		//==============================================================================
		//void paint(juce::Graphics&) override;
		void resized() override;

		void timerCallback() override;

		bool keyPressed(const juce::KeyPress& k) override;

	private:
		std::optional<juce::WebBrowserComponent::Resource> getResource(const juce::String& url);

		void webUndoRedo(const juce::Array<juce::var>& args,
			juce::WebBrowserComponent::NativeFunctionCompletion completion);
		// This reference is provided as a quick way for your editor to
		// access the processor object that created it.
		ReverbulizerAudioProcessor& audioProcessor;

		juce::UndoManager& undoManager;

		// BEGIN NATIVE GUI
		juce::Slider gainSlider{ "gain slider" };
		juce::SliderParameterAttachment gainSliderAttachment;

		juce::ToggleButton bypassButton{ "Bypass" };
		juce::ButtonParameterAttachment bypassButtonAttachment;

		//juce::Slider widthSlider{ "widthSlider" };
		//juce::SliderParameterAttachment widthSliderAttachment;


		juce::TextButton runJavaScriptButton{ "Run some JavaScript" };
		juce::TextButton emitJavaScriptButton{ "Emit JavaScript event" };
		juce::Label labelUpdatedFromJavaScript{ "label", "To be updated from JavaScript" };
		// END NATIVE GUI


		// BEGIN WEB VIEW
		juce::WebSliderRelay webGainRelay;
		juce::WebToggleButtonRelay webBypassRelay;

		juce::WebSliderRelay webReverbSizeRelay;
		juce::WebSliderRelay webMixRelay; 
		juce::WebSliderRelay webWidthRelay;


		juce::WebBrowserComponent webView;

		juce::WebSliderParameterAttachment webGainSliderAttachment;
		juce::WebToggleButtonParameterAttachment webBypassToggleAttachment;

		juce::WebSliderParameterAttachment webReverbSizeSliderAttachment;
		juce::WebSliderParameterAttachment webMixSliderAttachment;
		juce::WebSliderParameterAttachment webWidthSliderAttachment;


		// END WEBVIEW

		JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ReverbulizerAudioProcessorEditor)
	};

	juce::File getResourceDirectory();
	juce::File getDLLDirectory();
}