/*
  ==============================================================================

    This file contains the basic framework code for a JUCE plugin editor.

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
        auto streamToVector(juce::InputStream& stream)
        {
            using namespace juce;
            std::vector<std::byte> result((size_t)stream.getTotalLength());
            stream.setPosition(0);
            [[maybe_unused]] const auto bytesRead = stream.read(result.data(), result.size());
            jassert(bytesRead == (ssize_t)result.size());
            return result;
        }

        const char* getMimeForExtension(const juce::String& extension)
        {
            static const std::unordered_map<juce::String, const char*> mimeMap =
            {
                { { "htm"   },  "text/html"                },
                { { "html"  },  "text/html"                },
                { { "txt"   },  "text/plain"               },
                { { "jpg"   },  "image/jpeg"               },
                { { "jpeg"  },  "image/jpeg"               },
                { { "svg"   },  "image/svg+xml"            },
                { { "ico"   },  "image/vnd.microsoft.icon" },
                { { "json"  },  "application/json"         },
                { { "png"   },  "image/png"                },
                { { "css"   },  "text/css"                 },
                { { "map"   },  "application/json"         },
                { { "js"    },  "text/javascript"          },
                { { "woff2" },  "font/woff2"               },
                { { "glb"   },  "model/gltf-binary"        },
                { { "gltf"  },  "model/gltf+json"          }
            };

            if (const auto it = mimeMap.find(extension.toLowerCase()); it != mimeMap.end())
                return it->second;

            jassertfalse;
            return "";
        }

        constexpr auto LOCAL_VITE_SERVER = "http://localhost:3000";

    }

    ReverbulizerAudioProcessorEditor::ReverbulizerAudioProcessorEditor(ReverbulizerAudioProcessor& p, juce::UndoManager& um)
        : AudioProcessorEditor(&p), 
        undoManager(um),
        audioProcessor(p),

        gainSliderAttachment{ *audioProcessor.apvts.getParameter(id::GAIN.getParamID()), gainSlider, &undoManager },
        bypassButtonAttachment { *audioProcessor.apvts.getParameter(id::BYPASS.getParamID()), bypassButton, &undoManager },
        monoButtonAttachment { *audioProcessor.apvts.getParameter(id::MONO.getParamID()), monoButton, &undoManager },

        webGainRelay{id::GAIN.getParamID()},
        webBypassRelay{ id::BYPASS.getParamID() },
        webMonoRelay{id::MONO.getParamID() },
        webReverbSizeRelay{id::SIZE.getParamID()},
        webMixRelay{id::MIX.getParamID()},
        webWidthRelay{id::WIDTH.getParamID()},
        webDampRelay{id::DAMP.getParamID()},
        webFreezeRelay{id::FREEZE.getParamID()},

        webView
        { 
        juce::WebBrowserComponent::Options{}
        .withBackend(juce::WebBrowserComponent::Options::Backend::webview2)
        .withWinWebView2Options(juce::WebBrowserComponent::Options::WinWebView2{}
        .withDLLLocation(getDLLDirectory())
        .withUserDataFolder(juce::File::getSpecialLocation(juce::File::tempDirectory)))
        .withResourceProvider([this](const auto& url) {return getResource(url); },
                              juce::URL{LOCAL_VITE_SERVER}.getOrigin())
        .withNativeIntegrationEnabled()
        .withUserScript(R"(console.log("C++ backend here: This is run before any other loading happens.");)")
        .withInitialisationData("pluginVendor", ProjectInfo::companyName)
        .withInitialisationData("pluginName", ProjectInfo::projectName)
        .withInitialisationData("pluginVersion", ProjectInfo::versionString)
        .withNativeFunction(
            juce::Identifier{"webUndoRedo"},
            [this](const juce::Array<juce::var>& args,
                juce::WebBrowserComponent::NativeFunctionCompletion completion) {
                    webUndoRedo(args, std::move(completion));
            }
        )
        .withEventListener("undoRequest", [this](juce::var undoButton) { undoManager.undo(); })
        .withEventListener("redoRequest", [this](juce::var redoButton) { undoManager.redo(); })
        .withOptionsFrom(webGainRelay)
        .withOptionsFrom(webBypassRelay)
        .withOptionsFrom(webMonoRelay)
        .withOptionsFrom(webReverbSizeRelay)
        .withOptionsFrom(webMixRelay)
        .withOptionsFrom(webWidthRelay)
        .withOptionsFrom(webDampRelay)
        .withOptionsFrom(webFreezeRelay)},
        webGainSliderAttachment{ *audioProcessor.apvts.getParameter(id::GAIN.getParamID()),
                                webGainRelay,
                                &undoManager },
        webBypassToggleAttachment{ *audioProcessor.apvts.getParameter(id::BYPASS.getParamID()),
                                   webBypassRelay,
                                   &undoManager},
        webMonoToggleAttachment{*audioProcessor.apvts.getParameter(id::MONO.getParamID()),
                                 webMonoRelay,
                                 &undoManager},
        webReverbSizeSliderAttachment{ *audioProcessor.apvts.getParameter(id::SIZE.getParamID()),
                                   webReverbSizeRelay,
                                   &undoManager},
        webMixSliderAttachment{ *audioProcessor.apvts.getParameter(id::MIX.getParamID()),
                                 webMixRelay,
                                 &undoManager},
        webWidthSliderAttachment{ *audioProcessor.apvts.getParameter(id::WIDTH.getParamID()),
                                 webWidthRelay,
                                 &undoManager},
        webDampSliderAttachment{ *audioProcessor.apvts.getParameter(id::DAMP.getParamID()),
                                 webDampRelay,
                                 &undoManager},
        webFreezeSliderAttachment{ *audioProcessor.apvts.getParameter(id::FREEZE.getParamID()),
                                 webFreezeRelay,
                                 &undoManager}
    {

        addAndMakeVisible(webView);

        //webView.goToURL("https://google.com");
        //webView.goToURL(webView.getResourceProviderRoot());
        webView.goToURL(LOCAL_VITE_SERVER);

        runJavaScriptButton.onClick = [this] {
            constexpr auto JAVASCRIPT_TO_RUN{ "console.log(\"Hello from C++!\")" };
            webView.evaluateJavascript(
                JAVASCRIPT_TO_RUN,
                [](juce::WebBrowserComponent::EvaluationResult result) {
                    if (const auto* resultPtr = result.getResult()) {
                        std::cout << "JavaScript evaluation result: " << resultPtr->toString() << std::endl;
                    }
                    else {
                        std::cout << "JavaScript evaluation failed: " << result.getError()->message << std::endl;
                    }
                }
            );
        };
        addAndMakeVisible(runJavaScriptButton);
        

        emitJavaScriptButton.onClick = [this] {
            static const juce::Identifier EVENT_ID{ "exampleEvent" };
            webView.emitEventIfBrowserIsVisible(EVENT_ID, audioProcessor.apvts.getParameter(id::MIX.getParamID())->getCurrentValueAsText());
        };
        addAndMakeVisible(emitJavaScriptButton);

        addAndMakeVisible(labelUpdatedFromJavaScript);
        
        addAndMakeVisible(gainSlider);
        gainSlider.setSliderStyle(juce::Slider::SliderStyle::LinearBar);

        addAndMakeVisible(bypassButton);
        addAndMakeVisible(monoButton);

        setResizable(true, true);
        setSize(1366, 768);
        startTimer(60);
    }

    ReverbulizerAudioProcessorEditor::~ReverbulizerAudioProcessorEditor()
    {
    }

    //==============================================================================
    void ReverbulizerAudioProcessorEditor::resized()
    {
        auto bounds = getLocalBounds();
        //const int amountToRemove = getWidth() / 2;
        webView.setBounds(bounds);
        //runJavaScriptButton.setBounds(bounds.removeFromTop(50).reduced(5));
        //emitJavaScriptButton.setBounds(bounds.removeFromTop(50).reduced(5));
        //labelUpdatedFromJavaScript.setBounds(bounds.removeFromTop(50).reduced(5));
        //gainSlider.setBounds(bounds.removeFromTop(50).reduced(5));
        //bypassButton.setBounds(bounds.removeFromTop(50).reduced(10));
        //monoButton.setBounds(bounds.removeFromTop(50).reduced(10));
    }

    void ReverbulizerAudioProcessorEditor::timerCallback()
    {
       webView.emitEventIfBrowserIsVisible("outputLevel", juce::var{});
       webView.emitEventIfBrowserIsVisible("isFrozen", juce::var{});
    }

    // ctrl + z == undo; ctrl + y == redo
    // for undo/redo in cpp gui side
    bool ReverbulizerAudioProcessorEditor::keyPressed(const juce::KeyPress& k)
    {
        if (k.getModifiers().isCommandDown())
        {
            if (k.isKeyCode('Z'))
                undoManager.undo();
            else if (k.isKeyCode('Y'))
                undoManager.redo();
            return true;
        }
        return false;
    }

    void ReverbulizerAudioProcessorEditor::webUndoRedo(const juce::Array<juce::var>& args,
        juce::WebBrowserComponent::NativeFunctionCompletion completion)
    {
        char keyVal{ static_cast<char>(args[0].toString()[0]) };
        bool undoCommand{ keyVal == 'Z' };
        undoCommand ? completion("Undo key combo pressed") : completion("Redo key combo pressed");

        labelUpdatedFromJavaScript.setText(undoCommand ? "Web action undone" : "Web action redone", juce::dontSendNotification);

        const juce::KeyPress& kp{ keyVal, juce::ModifierKeys::ctrlModifier, 0 };
        keyPressed(kp);
    }

    std::optional<juce::WebBrowserComponent::Resource> ReverbulizerAudioProcessorEditor::getResource(const juce::String& url)
    {
        //static const auto resourceFileRoot = juce::File{ R"(C:\Users\Joe\source\repos\Reverbulizer\Source\ui\public)"};
        static const auto resourceDirectory = getResourceDirectory();
        const auto resourceToRetrieve = url == "/" ? "index.html" : url.fromFirstOccurrenceOf("/", false, false);

        if (resourceToRetrieve == "outputLevel.json")
        {
            juce::DynamicObject::Ptr data{ new juce::DynamicObject };
            data->setProperty("left", audioProcessor.outputLevelLeft.load());
            const auto string = juce::JSON::toString(data.get());
            juce::MemoryInputStream stream{ string.getCharPointer(),
                string.getNumBytesAsUTF8(), false };
            return juce::WebBrowserComponent::Resource{ streamToVector(stream), juce::String{"application/json"} };
        }

        if (resourceToRetrieve == "freeze.json")
        {
            juce::DynamicObject::Ptr data{ new juce::DynamicObject };
            data->setProperty("freeze", audioProcessor.isFrozen);
            const auto string = juce::JSON::toString(data.get());
            juce::MemoryInputStream stream{ string.getCharPointer(),
                string.getNumBytesAsUTF8(), false };
            return juce::WebBrowserComponent::Resource{ streamToVector(stream), juce::String{"application/json"} };
        }

        if (resourceToRetrieve == "data.json")
        {
            juce::DynamicObject::Ptr data{ new juce::DynamicObject };
            data->setProperty("sampleProperty", 300.0);
            const auto string = juce::JSON::toString(data.get());
            juce::MemoryInputStream stream{ string.getCharPointer(),
                string.getNumBytesAsUTF8(), false };
            return juce::WebBrowserComponent::Resource{ streamToVector(stream), juce::String{"application/json"} };
        }

        const auto resource = resourceDirectory.getChildFile(resourceToRetrieve).createInputStream();

        if (resource)
        {
            const auto extension = resourceToRetrieve.fromLastOccurrenceOf(".", false, false);
            return juce::WebBrowserComponent::Resource{ streamToVector(*resource), getMimeForExtension(extension) };
        }

        return std::nullopt;
    }

    juce::File getResourceDirectory()
    {
        auto current = juce::File::getCurrentWorkingDirectory();

        while (current.getFileName() != juce::String(ProjectInfo::projectName))
        {
            current = current.getParentDirectory();
            jassert(current.exists());
        }

        return current.getChildFile("Source/ui/public/");
    }

    juce::File getDLLDirectory()
    {
        return juce::File::getSpecialLocation(juce::File::currentApplicationFile)
            .getParentDirectory()
            .getChildFile("WebView2Loader.dll");
    }
}
