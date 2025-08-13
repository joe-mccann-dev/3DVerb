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
	class ThreeDVerbAudioProcessorEditor : public juce::AudioProcessorEditor,
		private juce::Timer
	{
	public:
		ThreeDVerbAudioProcessorEditor(ThreeDVerbAudioProcessor&, juce::UndoManager& um);
		~ThreeDVerbAudioProcessorEditor() override;

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
		ThreeDVerbAudioProcessor& audioProcessor;

		juce::UndoManager& undoManager;

		// BEGIN WEB VIEW
		juce::WebSliderRelay webGainRelay;
		juce::WebToggleButtonRelay webBypassRelay;
		juce::WebToggleButtonRelay webMonoRelay;

		juce::WebSliderRelay webRoomSizeRelay;
		juce::WebSliderRelay webMixRelay; 
		juce::WebSliderRelay webWidthRelay;
		juce::WebSliderRelay webDampRelay;
		juce::WebSliderRelay webFreezeRelay;


		juce::WebBrowserComponent webView;
		juce::WebBrowserComponent::Options getWebViewOptions();

		juce::WebSliderParameterAttachment webGainSliderAttachment;
		juce::WebToggleButtonParameterAttachment webBypassToggleAttachment;
		juce::WebToggleButtonParameterAttachment webMonoToggleAttachment;

		juce::WebSliderParameterAttachment webRoomSizeSliderAttachment;
		juce::WebSliderParameterAttachment webMixSliderAttachment;
		juce::WebSliderParameterAttachment webWidthSliderAttachment;
		juce::WebSliderParameterAttachment webDampSliderAttachment;
		juce::WebSliderParameterAttachment webFreezeSliderAttachment;
		
		// END WEBVIEW

		JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ThreeDVerbAudioProcessorEditor)
	};

	juce::File getResourceDirectory();
	juce::File getDLLDirectory();
}