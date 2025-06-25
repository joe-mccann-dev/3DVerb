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
        bool isFrozen;
        juce::var mixValue;
        juce::var roomSizeValue;
        juce::var widthValue;
        juce::Array<juce::var> mags;

        static constexpr size_t getMagsSize() { return magsSize; };
        juce::CriticalSection magsLock;
        
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
        void setEnvFollowerParams(juce::dsp::BallisticsFilter<float> envFollower);

        static constexpr auto fftOrder{ 10 };
        static constexpr auto fftSize{ 1 << fftOrder };
        static constexpr auto fftDataSize{ fftSize * 2 };
        static constexpr auto magsSize{ fftSize / 2 + 1 };
        // https://juce.com/tutorials/tutorial_simple_fft/
        juce::dsp::FFT forwardFFT;
        std::array<float, fftSize> fifo; // for holding samples
        std::array<float, fftSize * 2> fftData; // for holding transformed sample data
        std::array<float, magsSize> magnitudes; // for storing magnitues output by fftData
        int fifoIndex{ 0 };
      
        juce::UndoManager undoManager;

        void pushNextSampleIntoFifo(float sample) noexcept
        {
            if (fifoIndex == fftSize)
            {
                // copy fifo sample data into beginning of fftData
                std::copy(fifo.begin(), fifo.end(), fftData.begin());
                // perform FFT' on fftData; only calculate non-negative frequencies
                forwardFFT.performFrequencyOnlyForwardTransform(fftData.data(), true);
                // copy magnitudes into output array
                std::copy_n(fftData.begin(), magnitudes.size(), magnitudes.begin());
                
                fifoIndex = 0;
                
                // for thread-safety. scopedlock automatically unlocks at end of block using RAII
                juce::ScopedLock lock(magsLock);
                mags.clearQuick();
                for (auto mag : magnitudes) mags.add(mag);
                
            }
            fifo[(size_t)fifoIndex++] = sample;
        }

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ReverbulizerAudioProcessor)
    };
}