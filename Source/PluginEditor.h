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
    class ReverbulizerAudioProcessorEditor : public juce::AudioProcessorEditor
    {
    public:
        ReverbulizerAudioProcessorEditor(ReverbulizerAudioProcessor&);
        ~ReverbulizerAudioProcessorEditor() override;

        //==============================================================================
        //void paint(juce::Graphics&) override;
        void resized() override;

    private:
        std::optional<juce::WebBrowserComponent::Resource> getResource(const juce::String& url);
        // This reference is provided as a quick way for your editor to
        // access the processor object that created it.
        ReverbulizerAudioProcessor& audioProcessor;

        juce::WebBrowserComponent webView;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ReverbulizerAudioProcessorEditor)
    };
}