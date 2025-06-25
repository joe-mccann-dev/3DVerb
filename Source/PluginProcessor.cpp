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

            layout.add(std::make_unique<juce::AudioParameterFloat>(
                id::GAIN, "gain", juce::NormalisableRange<float>{0.f, 1.0f, 0.01f, 0.9f}, 1.f));

            layout.add(std::make_unique<juce::AudioParameterBool>(
                id::BYPASS, "bypass", false, juce::AudioParameterBoolAttributes{}));

            layout.add(std::make_unique<juce::AudioParameterBool>(
                id::MONO, "mono", true, juce::AudioParameterBoolAttributes{}));

            layout.add(std::make_unique<juce::AudioParameterFloat>(
                id::SIZE, "size", juce::NormalisableRange<float>{0.f, 1.0f, 0.01f, 1.f}, 0.5f));

            layout.add(std::make_unique<juce::AudioParameterFloat>(
                // range params =  (rangeStart, rangeEnd, intervalValue, skewFactor)
                id::MIX, "mix", juce::NormalisableRange<float>{0.f, 1.0f, 0.01f, 1.f}, 0.75f));

            layout.add(std::make_unique<juce::AudioParameterFloat>(
                id::WIDTH, "width", juce::NormalisableRange<float>{0.f, 1.0f, 0.01f, 1.f}, 0.75f));

            layout.add(std::make_unique<juce::AudioParameterFloat>(
                // range params =  (rangeStart, rangeEnd, intervalValue, skewFactor)
                id::DAMP, "damp", juce::NormalisableRange<float>{0.f, 1.0f, 0.01f, 1.f}, 0.5f));

            layout.add(std::make_unique<juce::AudioParameterFloat>(
                id::FREEZE, "freeze",
                juce::NormalisableRange<float>{0.0f, 1.0f, 0.01f}, 0.0f));

            return layout;
        }
    }
    ReverbulizerAudioProcessor::ReverbulizerAudioProcessor()
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
        // note: can review WebViewPluginDemo to find cleaner way to cast this
        bypass{ *dynamic_cast<juce::AudioParameterBool*>(apvts.getParameter(id::BYPASS.getParamID())) },
        mono {*dynamic_cast<juce::AudioParameterBool*>(apvts.getParameter(id::MONO.getParamID()))},
        size{ dynamic_cast<juce::AudioParameterFloat*>(apvts.getParameter(id::SIZE.getParamID())) },
        mix{ dynamic_cast<juce::AudioParameterFloat*>(apvts.getParameter(id::MIX.getParamID())) },
        width{ dynamic_cast<juce::AudioParameterFloat*>(apvts.getParameter(id::WIDTH.getParamID())) },
        damp{dynamic_cast<juce::AudioParameterFloat*>(apvts.getParameter(id::DAMP.getParamID()))},
        freeze{ dynamic_cast<juce::AudioParameterFloat*>(apvts.getParameter(id::FREEZE.getParamID())) },
        forwardFFT{fftOrder}
    {
    }

    ReverbulizerAudioProcessor::~ReverbulizerAudioProcessor()
    {
    }

    //==============================================================================
    const juce::String ReverbulizerAudioProcessor::getName() const
    {
        return JucePlugin_Name;
    }

    bool ReverbulizerAudioProcessor::acceptsMidi() const
    {
        #if JucePlugin_WantsMidiInput
            return true;
        #else
            return false;
        #endif
    }

    bool ReverbulizerAudioProcessor::producesMidi() const
    {
        #if JucePlugin_ProducesMidiOutput
            return true;
        #else
            return false;
        #endif
    }

    bool ReverbulizerAudioProcessor::isMidiEffect() const
    {
        #if JucePlugin_IsMidiEffect
            return true;
        #else
            return false;
        #endif
    }

    double ReverbulizerAudioProcessor::getTailLengthSeconds() const
    {
        return 0.0;
    }

    int ReverbulizerAudioProcessor::getNumPrograms()
    {
        return 1;   // NB: some hosts don't cope very well if you tell them there are 0 programs,
        // so this should be at least 1, even if you're not really implementing programs.
    }

    int ReverbulizerAudioProcessor::getCurrentProgram()
    {
        return 0;
    }

    void ReverbulizerAudioProcessor::setCurrentProgram(int index)
    {
    }

    const juce::String ReverbulizerAudioProcessor::getProgramName(int index)
    {
        return {};
    }

    void ReverbulizerAudioProcessor::changeProgramName(int index, const juce::String& newName)
    {
    }

    //==============================================================================
    void ReverbulizerAudioProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
    {
        // Use this method as the place to do any pre-playback
        // initialisation that you need..
        juce::dsp::ProcessSpec spec{};

        spec.sampleRate = sampleRate;
        spec.maximumBlockSize = static_cast<juce::uint32>(samplesPerBlock);
        spec.numChannels = static_cast<juce::uint32>(getTotalNumOutputChannels());

        envelopeFollower.prepare(spec);
        setEnvFollowerParams(envelopeFollower);
        envelopeFollowerOutputBuffer.setSize(getTotalNumOutputChannels(), samplesPerBlock);

        reverb.prepare(spec);
    }

    void ReverbulizerAudioProcessor::releaseResources()
    {
        // When playback stops, you can use this as an opportunity to free up any
        // spare memory, etc.
    }

    #ifndef JucePlugin_PreferredChannelConfigurations
    bool ReverbulizerAudioProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
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

    void ReverbulizerAudioProcessor::updateReverb()
    {
        params.roomSize = size->get();
        params.wetLevel = mix->get();
        params.dryLevel = 1.0f - mix->get();
        params.width = width->get();
        params.damping = damp->get();
        params.freezeMode = freeze->get();

        reverb.setParameters(params);
    }

    void ReverbulizerAudioProcessor::setEnvFollowerParams(juce::dsp::BallisticsFilter<float> envFollower)
    {  
        envFollower.setAttackTime(200.f);
        envFollower.setReleaseTime(200.f);
        envFollower.setLevelCalculationType(
            juce::dsp::BallisticsFilter<float>::LevelCalculationType::peak);
    }

    void ReverbulizerAudioProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
    {
        juce::ScopedNoDenormals noDenormals;
        // clears empty output channels 
        for (auto i = getTotalNumInputChannels(); i < getTotalNumOutputChannels(); ++i)
        {
            buffer.clear(i, 0, buffer.getNumSamples());
        }

        // TODO: Only perform this check in Standalone Mode 
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

        if (bypass.get()) { return; }
        // TODO: smooth gain to prevent rapid changes in gain
        buffer.applyGain(*gain);

        juce::dsp::AudioBlock<float> block{ buffer };
        juce::dsp::AudioBlock<float> envOutBlock{ envelopeFollowerOutputBuffer };

        juce::dsp::ProcessContextNonReplacing<float> envCtx{ block, envOutBlock };
        envelopeFollower.process(envCtx);

        updateReverb();
        juce::dsp::ProcessContextReplacing<float> reverbCtx{block};
        reverb.process(reverbCtx);

        for (auto i = 0; i < block.getNumSamples(); ++i)
        {
            // average L + R stereo samples into single sample
            float monoSample = 0.5f * (block.getChannelPointer(0)[i] + block.getChannelPointer(1)[i]);
            pushNextSampleIntoFifo(monoSample);
        }
        
        outputLevelLeft = juce::Decibels::gainToDecibels(envOutBlock.getSample(0u, static_cast<int>(envOutBlock.getNumSamples() - 1)));
        isFrozen = params.freezeMode > 0.5f;
        mixValue = params.wetLevel;
        roomSizeValue = params.roomSize;
        widthValue = params.width;
    }

    //==============================================================================
    bool ReverbulizerAudioProcessor::hasEditor() const
    {
        return true; // (change this to false if you choose to not supply an editor)
    }

    juce::AudioProcessorEditor* ReverbulizerAudioProcessor::createEditor()
    {
        return new ReverbulizerAudioProcessorEditor(*this, undoManager);
    }

    //==============================================================================
    void ReverbulizerAudioProcessor::getStateInformation(juce::MemoryBlock& destData)
    {
        // You should use this method to store your parameters in the memory block.
        // You could do that either as raw data, or use the XML or ValueTree classes
        // as intermediaries to make it easy to save and load complex data.
        juce::MemoryOutputStream mos(destData, true);
        apvts.state.writeToStream(mos);
    }

    void ReverbulizerAudioProcessor::setStateInformation(const void* data, int sizeInBytes)
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
}
    //==============================================================================
    // This creates new instances of the plugin..
    juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
    {
        return new webview_plugin::ReverbulizerAudioProcessor();
    }