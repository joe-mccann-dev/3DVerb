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
        ReverbulizerAudioProcessorEditor(ReverbulizerAudioProcessor&);
        ~ReverbulizerAudioProcessorEditor() override;

        //==============================================================================
        //void paint(juce::Graphics&) override;
        void resized() override;

        void timerCallback() override;

    private:
        std::optional<juce::WebBrowserComponent::Resource> getResource(const juce::String& url);

        void nativeFunction(const juce::Array<juce::var>& args, 
            juce::WebBrowserComponent::NativeFunctionCompletion completion);
        // This reference is provided as a quick way for your editor to
        // access the processor object that created it.
        ReverbulizerAudioProcessor& audioProcessor;

        juce::TextButton runJavaScriptButton{ "Run some JavaScript" };
        juce::TextButton emitJavaScriptButton{ "Emit JavaScript event" };

        juce::Label labelUpdatedFromJavaScript{ "label", "To be updated from JavaScript" };

        juce::WebBrowserComponent webView;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ReverbulizerAudioProcessorEditor)
    };

    juce::File getResourceDirectory();
}