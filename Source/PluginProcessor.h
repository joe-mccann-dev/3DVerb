/*
  ==============================================================================

    This file contains the basic framework code for a JUCE plugin processor.

  ==============================================================================
*/

#pragma once

#include <JuceHeader.h>

//==============================================================================
/**
*/
namespace webview_plugin
{
    class ReverbulizerAudioProcessor : public juce::AudioProcessor
    {
    public:
        //==============================================================================
        ReverbulizerAudioProcessor();
        ~ReverbulizerAudioProcessor() override;

        //==============================================================================
        void prepareToPlay(double sampleRate, int samplesPerBlock) override;
        void releaseResources() override;

        #ifndef JucePlugin_PreferredChannelConfigurations
            bool isBusesLayoutSupported(const BusesLayout& layouts) const override;
        #endif

        void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

        //==============================================================================
        juce::AudioProcessorEditor* createEditor() override;
        bool hasEditor() const override;

        //==============================================================================
        const juce::String getName() const override;

        bool acceptsMidi() const override;
        bool producesMidi() const override;
        bool isMidiEffect() const override;
        double getTailLengthSeconds() const override;

        //==============================================================================
        int getNumPrograms() override;
        int getCurrentProgram() override;
        void setCurrentProgram(int index) override;
        const juce::String getProgramName(int index) override;
        void changeProgramName(int index, const juce::String& newName) override;

        //==============================================================================
        void getStateInformation(juce::MemoryBlock& destData) override;
        void setStateInformation(const void* data, int sizeInBytes) override;

        juce::AudioProcessorValueTreeState apvts;

        std::atomic<float> outputLevelLeft;

    private:
        //==============================================================================
        std::atomic<float>* gain{ nullptr };
        juce::AudioParameterBool& bypass;
        juce::AudioParameterBool& mono;

        juce::dsp::BallisticsFilter<float> envelopeFollower;
        juce::AudioBuffer<float> envelopeFollowerOutputBuffer;

        // BEGIN REVERB PARAMS
        juce::dsp::Reverb reverb;
        juce::dsp::Reverb::Parameters params;

        juce::AudioParameterFloat* size{ nullptr };
        juce::AudioParameterFloat* mix{ nullptr };
        juce::AudioParameterFloat* width{ nullptr };
        juce::AudioParameterFloat* damp{ nullptr };
        juce::AudioParameterFloat* freeze{ nullptr };

        void updateReverb();

        juce::UndoManager undoManager;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ReverbulizerAudioProcessor)
    };
}