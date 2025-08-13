/*
  ==============================================================================

    This file contains the basic framework code for a JUCE plugin processor.

  ==============================================================================
*/

#include "PluginProcessor.h"
#include "PluginEditor.h"
#include "ParameterIDs.h"

//==============================================================================
namespace webview_plugin
{
    namespace
    {
        auto createParameterLayout()
        {
            juce::AudioProcessorValueTreeState::ParameterLayout layout;

            juce::NormalisableRange<float> standardLinearRange = { 0.f, 1.0f, 0.01f };

            layout.add(std::make_unique<juce::AudioParameterBool>(
                id::BYPASS, "bypass", false, juce::AudioParameterBoolAttributes{}));

            layout.add(std::make_unique<juce::AudioParameterBool>(
                id::MONO, "mono", true, juce::AudioParameterBoolAttributes{}));

            layout.add(std::make_unique<juce::AudioParameterFloat>(
                id::GAIN, "gain", standardLinearRange, 1.f));

            layout.add(std::make_unique<juce::AudioParameterFloat>(
                id::SIZE, "size", standardLinearRange, 0.5f));

            layout.add(std::make_unique<juce::AudioParameterFloat>(
                // range params =  (rangeStart, rangeEnd, intervalValue, skewFactor)
                id::MIX, "mix", standardLinearRange, 0.75f));

            layout.add(std::make_unique<juce::AudioParameterFloat>(
                id::WIDTH, "width", standardLinearRange, 0.75f));

            layout.add(std::make_unique<juce::AudioParameterFloat>(
                // range params =  (rangeStart, rangeEnd, intervalValue, skewFactor)
                id::DAMP, "damp", standardLinearRange, 0.5f));

            layout.add(std::make_unique<juce::AudioParameterFloat>(
                id::FREEZE, "freeze",
                standardLinearRange, 0.0f));

            return layout;
        }
    }
    ThreeDVerbAudioProcessor::ThreeDVerbAudioProcessor()
#ifndef JucePlugin_PreferredChannelConfigurations
        : AudioProcessor(BusesProperties()
#if ! JucePlugin_IsMidiEffect
#if ! JucePlugin_IsSynth
            .withInput("Input", juce::AudioChannelSet::stereo(), true)
#endif
            .withOutput("Output", juce::AudioChannelSet::stereo(), true)
#endif
        ),
#endif
        apvts{ *this, &undoManager, "APVTS", createParameterLayout() },
        gain{ apvts.getRawParameterValue(id::GAIN.getParamID()) },
        smoothedGain{ 1.0f },
        // note: can review WebViewPluginDemo to find cleaner way to cast this
        bypass{ *dynamic_cast<juce::AudioParameterBool*>(apvts.getParameter(id::BYPASS.getParamID())) },
        mono {*dynamic_cast<juce::AudioParameterBool*>(apvts.getParameter(id::MONO.getParamID()))},
        size{ dynamic_cast<juce::AudioParameterFloat*>(apvts.getParameter(id::SIZE.getParamID())) },
        mix{ dynamic_cast<juce::AudioParameterFloat*>(apvts.getParameter(id::MIX.getParamID())) },
        width{ dynamic_cast<juce::AudioParameterFloat*>(apvts.getParameter(id::WIDTH.getParamID())) },
        damp{dynamic_cast<juce::AudioParameterFloat*>(apvts.getParameter(id::DAMP.getParamID()))},
        freeze{ dynamic_cast<juce::AudioParameterFloat*>(apvts.getParameter(id::FREEZE.getParamID())) }
        //forwardFFT{fifo->fftOrder},
        //window{fftSize, juce::dsp::WindowingFunction<float>::hann}
    {
        apvts.addParameterListener(id::GAIN.getParamID(), this);
    }

    ThreeDVerbAudioProcessor::~ThreeDVerbAudioProcessor()
    {
    }

    //==============================================================================
    const juce::String ThreeDVerbAudioProcessor::getName() const
    {
        return JucePlugin_Name;
    }

    bool ThreeDVerbAudioProcessor::acceptsMidi() const
    {
        #if JucePlugin_WantsMidiInput
            return true;
        #else
            return false;
        #endif
    }

    bool ThreeDVerbAudioProcessor::producesMidi() const
    {
        #if JucePlugin_ProducesMidiOutput
            return true;
        #else
            return false;
        #endif
    }

    bool ThreeDVerbAudioProcessor::isMidiEffect() const
    {
        #if JucePlugin_IsMidiEffect
            return true;
        #else
            return false;
        #endif
    }

    double ThreeDVerbAudioProcessor::getTailLengthSeconds() const
    {
        return 0.0;
    }

    int ThreeDVerbAudioProcessor::getNumPrograms()
    {
        return 1;   // NB: some hosts don't cope very well if you tell them there are 0 programs,
        // so this should be at least 1, even if you're not really implementing programs.
    }

    int ThreeDVerbAudioProcessor::getCurrentProgram()
    {
        return 0;
    }

    void ThreeDVerbAudioProcessor::setCurrentProgram(int index)
    {
    }

    const juce::String ThreeDVerbAudioProcessor::getProgramName(int index)
    {
        return {};
    }

    void ThreeDVerbAudioProcessor::changeProgramName(int index, const juce::String& newName)
    {
    }

    //==============================================================================
    void ThreeDVerbAudioProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
    {
        // Use this method as the place to do any pre-playback
        // initialisation that you need..
        juce::dsp::ProcessSpec spec{};

        spec.sampleRate = sampleRate;
        spec.maximumBlockSize = static_cast<juce::uint32>(samplesPerBlock);
        spec.numChannels = static_cast<juce::uint32>(getTotalNumOutputChannels());

        smoothedGain.reset(sampleRate, 0.001);
       
        envelopeFollower.prepare(spec);
        setEnvFollowerParams(envelopeFollower);
        envelopeFollowerOutputBuffer.setSize(getTotalNumOutputChannels(), samplesPerBlock);

        reverb.prepare(spec);
    }

    void ThreeDVerbAudioProcessor::releaseResources()
    {
        // When playback stops, you can use this as an opportunity to free up any
        // spare memory, etc.
    }

    #ifndef JucePlugin_PreferredChannelConfigurations
    bool ThreeDVerbAudioProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
    {
        juce::ignoreUnused(layouts);
        // This is the place where you check if the layout is supported.
        // In this template code we only support mono or stereo.
        // Some plugin hosts, such as certain GarageBand versions, will only
        // load plugins that support stereo bus layouts.
        if (layouts.getMainOutputChannelSet() == juce::AudioChannelSet::mono()
            || layouts.getMainOutputChannelSet() == juce::AudioChannelSet::stereo())
        {
            return layouts.getMainOutputChannelSet() == juce::AudioChannelSet::stereo();
        }

        return false;

    }
    #endif

    void ThreeDVerbAudioProcessor::updateReverb()
    {
        params.roomSize = size->get();
        params.wetLevel = mix->get();
        params.dryLevel = 1.0f - mix->get();
        params.width = width->get();
        params.damping = damp->get();
        params.freezeMode = freeze->get();

        reverb.setParameters(params);
    }

    void ThreeDVerbAudioProcessor::setEnvFollowerParams(juce::dsp::BallisticsFilter<float> envFollower)
    {  
        envFollower.setAttackTime(200.f);
        envFollower.setReleaseTime(200.f);
        envFollower.setLevelCalculationType(
            juce::dsp::BallisticsFilter<float>::LevelCalculationType::peak);
    }

    void ThreeDVerbAudioProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
    {
        juce::ScopedNoDenormals noDenormals;
        // clears empty output channels 
        for (auto i = getTotalNumInputChannels(); i < getTotalNumOutputChannels(); ++i)
        {
            buffer.clear(i, 0, buffer.getNumSamples());
        }

        // TODO: Only perform this check in Standalone Mode 
        sumLeftAndRightChannels(buffer);

        if (bypass.get()) { return; }

        /*smoothedGain.setTargetValue(*gain);*/
        auto nextVal = smoothedGain.getNextValue();
        //DBG(nextVal);
        buffer.applyGain(nextVal);

        juce::dsp::AudioBlock<float> block{ buffer };
        juce::dsp::AudioBlock<float> envOutBlock{ envelopeFollowerOutputBuffer };

        juce::dsp::ProcessContextNonReplacing<float> envCtx{ block, envOutBlock };
        envelopeFollower.process(envCtx);

        updateReverb();
        juce::dsp::ProcessContextReplacing<float> reverbCtx{block};
        reverb.process(reverbCtx);

        prepareForFFT(block);
        
        setParamsForFrontend(envOutBlock);
    }

    void ThreeDVerbAudioProcessor::sumLeftAndRightChannels(juce::AudioBuffer<float>& buffer)
    {
        bool monoInputChecked = mono.get();
        if (monoInputChecked && getTotalNumInputChannels() >= 2)
        {
            auto* monoInput = buffer.getReadPointer(0);
            auto* leftOut = buffer.getWritePointer(0);
            auto* rightOut = buffer.getWritePointer(1);

            for (int i = 0; i < buffer.getNumSamples(); ++i)
            {
                leftOut[i] = monoInput[i];
                rightOut[i] = monoInput[i];
            }
        }
    }

    void ThreeDVerbAudioProcessor::prepareForFFT(juce::dsp::AudioBlock<float> block)
    {
        for (auto i = 0; i < block.getNumSamples(); ++i)
        {
            // average L + R stereo samples into single sample
            float monoSample = 0.5f * (block.getChannelPointer(0)[i] + block.getChannelPointer(1)[i]);
            // push sample into an array so that a set block of samples 
            // can be processed by FFT algorithm. FFT transforms time domain to frequency domain.
            // Frequency data are gathered in "freq bins" that represent magnitudes
            // of a given freq. over the duration of the block
            pushNextSampleIntoFifo(monoSample);
        }
    }

    void ThreeDVerbAudioProcessor::setParamsForFrontend(juce::dsp::AudioBlock<float> envOutBlock)
    {
        outputLevelLeft = juce::Decibels::gainToDecibels(envOutBlock.getSample(0u, static_cast<int>(envOutBlock.getNumSamples() - 1)));
        isFrozen = params.freezeMode > 0.5f;
        mixValue = params.wetLevel;
        roomSizeValue = params.roomSize;
        widthValue = params.width;
        dampValue = params.damping;
    }

    //==============================================================================
    bool ThreeDVerbAudioProcessor::hasEditor() const
    {
        return true; // (change this to false if you choose to not supply an editor)
    }

    juce::AudioProcessorEditor* ThreeDVerbAudioProcessor::createEditor()
    {
        return new ThreeDVerbAudioProcessorEditor(*this, undoManager);
    }

    //==============================================================================
    void ThreeDVerbAudioProcessor::getStateInformation(juce::MemoryBlock& destData)
    {
        // You should use this method to store your parameters in the memory block.
        // You could do that either as raw data, or use the XML or ValueTree classes
        // as intermediaries to make it easy to save and load complex data.
        juce::MemoryOutputStream mos(destData, true);
        apvts.state.writeToStream(mos);
    }

    void ThreeDVerbAudioProcessor::setStateInformation(const void* data, int sizeInBytes)
    {
        // You should use this method to restore your parameters from this memory block,
        // whose contents will have been created by the getStateInformation() call.
        auto tree = juce::ValueTree::readFromData(data, sizeInBytes);
        if (tree.isValid())
        {
            apvts.replaceState(tree);
            updateReverb();
        }
    }

    void ThreeDVerbAudioProcessor::parameterChanged(const juce::String& parameterID, float newValue)
    {
        smoothedGain.setTargetValue(newValue);
    }
}
    //==============================================================================
    // This creates new instances of the plugin..
    juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
    {
        return new webview_plugin::ThreeDVerbAudioProcessor();
    }