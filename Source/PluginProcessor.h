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
        // store normalized levels derived from fftData below
        juce::Array<juce::var> levels;

        static constexpr size_t getScopeSize() { return scopeSize; };
        juce::CriticalSection levelsLock;
        
    private:
        //==============================================================================
        std::atomic<float>* gain{ nullptr };
        juce::AudioParameterBool& bypass;
        juce::AudioParameterBool& mono;

        juce::dsp::BallisticsFilter<float> envelopeFollower;
        juce::AudioBuffer<float> envelopeFollowerOutputBuffer;

        // REVERB PARAMS
        juce::dsp::Reverb reverb;
        juce::dsp::Reverb::Parameters params;

        juce::AudioParameterFloat* size{ nullptr };
        juce::AudioParameterFloat* mix{ nullptr };
        juce::AudioParameterFloat* width{ nullptr };
        juce::AudioParameterFloat* damp{ nullptr };
        juce::AudioParameterFloat* freeze{ nullptr };

        void updateReverb();
        void setEnvFollowerParams(juce::dsp::BallisticsFilter<float> envFollower);
        void setParamsForFrontend(juce::dsp::AudioBlock<float> envOutBlock);
        void prepareForFFT(juce::dsp::AudioBlock<float> block);
        void sumLeftAndRightChannels(juce::AudioBuffer<float>& buffer);

        static constexpr auto fftOrder{ 11 };
        static constexpr auto fftSize{ 1 << fftOrder };
        static constexpr auto fftDataSize{ fftSize * 2 };
        static constexpr auto scopeSize{ fftSize / 4 };

        // https://juce.com/tutorials/tutorial_simple_fft/
        juce::dsp::FFT forwardFFT;
        juce::dsp::WindowingFunction<float> window;
        std::array<float, fftSize> fifo; // for holding samples
        std::array<float, fftSize * 2> fftData; // for holding FFT processed sample data
        int fifoIndex{ 0 };
      
        juce::UndoManager undoManager;

        void pushNextSampleIntoFifo(float sample) noexcept
        {
            if (fifoIndex == fftSize)
            {
                // copy fifo sample data into beginning of fftData
                // for intermediate calcs, fftData can hold twice as much data as fifo
                std::copy(fifo.begin(), fifo.end(), fftData.begin());
                // reduce spectral leakage by applying windowing function to data; make more perceptually accurate
                window.multiplyWithWindowingTable(fftData.data(), fftSize);
                // perform FFT on fftData; only keep frequency information; only calculate non-negative frequencies;
                forwardFFT.performFrequencyOnlyForwardTransform(fftData.data(), true);                
                // for thread-safety. ScopedLock automatically unlocks at end of block using RAII
                juce::ScopedLock lock(levelsLock);
                levels.clearQuick();

                applyLogarithmicFreqMapping();
                fifoIndex = 0;
            }
            fifo[(size_t)fifoIndex++] = sample;
        }

        void applyLogarithmicFreqMapping() {
            auto mindB = -100.0f;
            auto maxdB = 0.0f;
            for (int i = 0; i < scopeSize; ++i)
            {
                auto skewedProportionX = 1.0f - std::exp(std::log(1.0f - (float)i / (float)scopeSize) * 0.2f);
                auto fftDataIndex = juce::jlimit(0, fftSize / 2, (int)(skewedProportionX * (float)fftSize * 0.5f));
                auto decibelsAtIndex = juce::Decibels::gainToDecibels(fftData.at(fftDataIndex));
                auto sourceValue = juce::jlimit(mindB, maxdB, decibelsAtIndex) - juce::Decibels::gainToDecibels((float)fftSize);
                auto level = juce::jmap(sourceValue, // sourceValue
                    mindB, // sourceRangeMin
                    maxdB, // sourceRangeMax
                    0.0f,  // targetRangeMin
                    1.0f); // targetRangeMax
                levels.add(level);
            }
        }

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ReverbulizerAudioProcessor)
    };
}