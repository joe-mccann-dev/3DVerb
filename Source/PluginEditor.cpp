/*
  ==============================================================================

    This file contains the basic framework code for a JUCE plugin editor.

  ==============================================================================
*/

#include "PluginProcessor.h"
#include "PluginEditor.h"

//==============================================================================
namespace webview_plugin
{
    ReverbulizerAudioProcessorEditor::ReverbulizerAudioProcessorEditor(ReverbulizerAudioProcessor& p)
        : AudioProcessorEditor(&p), 
        audioProcessor(p), 
        webView{ juce::WebBrowserComponent::Options{}.withBackend(juce::WebBrowserComponent::Options::Backend::webview2)
        .withWinWebView2Options(juce::WebBrowserComponent::Options::WinWebView2{}
        .withUserDataFolder(juce::File::getSpecialLocation(juce::File::tempDirectory)))
        }
    {

        addAndMakeVisible(webView);

        webView.goToURL("https://google.com");
        setResizable(true, true);
        setSize(800, 600);
    }

    ReverbulizerAudioProcessorEditor::~ReverbulizerAudioProcessorEditor()
    {
    }

    //==============================================================================
    void ReverbulizerAudioProcessorEditor::resized()
    {
        // This is generally where you'll want to lay out the positions of any
        // subcomponents in your editor..
        webView.setBounds(getLocalBounds());
    }
}
