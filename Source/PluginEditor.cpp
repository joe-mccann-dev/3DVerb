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

        // takes property string and the value to send to the frontend and returns a juce::WebBrowserComponent::Resource
        juce::WebBrowserComponent::Resource getPreparedResource(const juce::Identifier property, juce::var valueToSet)
        {
            juce::DynamicObject::Ptr data{ new juce::DynamicObject };
            data->setProperty(property, valueToSet);
            const auto string = juce::JSON::toString(data.get());
            juce::MemoryInputStream stream{
                string.getCharPointer(),
                string.getNumBytesAsUTF8(),
                false
            };
            return juce::WebBrowserComponent::Resource{ streamToVector(stream), juce::String("application/json") };
        }

        constexpr auto LOCAL_VITE_SERVER = "http://localhost:5173";

    }

    ThreeDVerbAudioProcessorEditor::ThreeDVerbAudioProcessorEditor(ThreeDVerbAudioProcessor& p, juce::UndoManager& um)
        : AudioProcessorEditor(&p), 
        undoManager(um),
        audioProcessor(p),

        // GAIN
        webGainRelay{id::GAIN.getParamID()},
        webGainSliderAttachment{ *audioProcessor.apvts.getParameter(id::GAIN.getParamID()),
                         webGainRelay,
                         &undoManager },

        // BYPASS
        webBypassRelay{ id::BYPASS.getParamID() },
        webBypassToggleAttachment{ *audioProcessor.apvts.getParameter(id::BYPASS.getParamID()),
                           webBypassRelay,
                           &undoManager },
        
        // MONO
        webMonoRelay{id::MONO.getParamID() },
        webMonoToggleAttachment{ *audioProcessor.apvts.getParameter(id::MONO.getParamID()),
                         webMonoRelay,
                         &undoManager },

        // ROOM SIZE
        webRoomSizeRelay{id::SIZE.getParamID()},
        webRoomSizeSliderAttachment{ *audioProcessor.apvts.getParameter(id::SIZE.getParamID()),
                               webRoomSizeRelay,
                               &undoManager },

        // MIX
        webMixRelay{id::MIX.getParamID()},
        webMixSliderAttachment{ *audioProcessor.apvts.getParameter(id::MIX.getParamID()),
                                webMixRelay,
                                &undoManager },

        // WIDTH
        webWidthRelay{id::WIDTH.getParamID()},
        webWidthSliderAttachment{ *audioProcessor.apvts.getParameter(id::WIDTH.getParamID()),
                          webWidthRelay,
                          &undoManager },

        // DAMP
        webDampRelay{id::DAMP.getParamID()},
        webDampSliderAttachment{ *audioProcessor.apvts.getParameter(id::DAMP.getParamID()),
                         webDampRelay,
                         &undoManager },

        // FREEZE
        webFreezeRelay{id::FREEZE.getParamID()},
        webFreezeSliderAttachment{ *audioProcessor.apvts.getParameter(id::FREEZE.getParamID()),
                                   webFreezeRelay,
                                   &undoManager },

        webView{ getWebViewOptions() }
    {
        
        addAndMakeVisible(webView);

        //webView.goToURL(webView.getResourceProviderRoot());
        webView.goToURL(LOCAL_VITE_SERVER);
        
        setResizable(false, false);
        setSize(1366, 768);
        startTimer(60);
    }

    ThreeDVerbAudioProcessorEditor::~ThreeDVerbAudioProcessorEditor()
    {
        stopTimer();
    }

    juce::WebBrowserComponent::Options ThreeDVerbAudioProcessorEditor::getWebViewOptions()
    {
        juce::WebBrowserComponent::Options options;

        juce::WebBrowserComponent::Options::WinWebView2 winOptions;
        winOptions = winOptions.withUserDataFolder(juce::File::getSpecialLocation(juce::File::tempDirectory));

        auto resourceProvider = [this](const auto& url)
        {
            return getResource(url);
        };

        return options
            .withBackend(juce::WebBrowserComponent::Options::Backend::webview2)
            .withWinWebView2Options(winOptions)
            .withResourceProvider(
                resourceProvider,
                juce::URL{ LOCAL_VITE_SERVER }.getOrigin()
            )
            .withNativeIntegrationEnabled()

            .withInitialisationData("pluginVendor", ProjectInfo::companyName)
            .withInitialisationData("pluginName", ProjectInfo::projectName)
            .withInitialisationData("pluginVersion", ProjectInfo::versionString)

            .withNativeFunction(
                juce::Identifier{ "webUndoRedo" },
                [this](
                    const juce::Array<juce::var>& args,
                    juce::WebBrowserComponent::NativeFunctionCompletion completion
                    )
                {
                    webUndoRedo(args, std::move(completion));
                }
            )
            .withEventListener("undoRequest", [this](juce::var undoButton) { undoManager.undo(); })
            .withEventListener("redoRequest", [this](juce::var redoButton) { undoManager.redo(); })

            .withOptionsFrom(webGainRelay)
            .withOptionsFrom(webBypassRelay)
            .withOptionsFrom(webMonoRelay)
            .withOptionsFrom(webRoomSizeRelay)
            .withOptionsFrom(webMixRelay)
            .withOptionsFrom(webWidthRelay)
            .withOptionsFrom(webDampRelay)
            .withOptionsFrom(webFreezeRelay);

    }

    //==============================================================================
    void ThreeDVerbAudioProcessorEditor::resized()
    {
        auto bounds = getLocalBounds();
        webView.setBounds(bounds);
    }

    void ThreeDVerbAudioProcessorEditor::timerCallback()
    {
       webView.emitEventIfBrowserIsVisible("outputLevel", juce::var{});
       webView.emitEventIfBrowserIsVisible("isFrozen", juce::var{});
       webView.emitEventIfBrowserIsVisible("mixValue", juce::var{});
       webView.emitEventIfBrowserIsVisible("roomSizeValue", juce::var{});
       webView.emitEventIfBrowserIsVisible("widthValue", juce::var{});
       webView.emitEventIfBrowserIsVisible("dampValue", juce::var{});
       webView.emitEventIfBrowserIsVisible("levels", juce::var{});
    }

    // ctrl + z == undo; ctrl + y == redo
    // for undo/redo in cpp gui side
    bool ThreeDVerbAudioProcessorEditor::keyPressed(const juce::KeyPress& k)
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

    void ThreeDVerbAudioProcessorEditor::webUndoRedo(const juce::Array<juce::var>& args,
        juce::WebBrowserComponent::NativeFunctionCompletion completion)
    {
        char keyVal{ static_cast<char>(args[0].toString()[0]) };
        bool undoCommand{ keyVal == 'Z' };
        undoCommand ? completion("Undo key combo pressed") : completion("Redo key combo pressed");

        const juce::KeyPress& kp{ keyVal, juce::ModifierKeys::ctrlModifier, 0 };
        keyPressed(kp);
    }

    std::optional<juce::WebBrowserComponent::Resource> ThreeDVerbAudioProcessorEditor::getResource(const juce::String& url)
    {
        //static const auto resourceFileRoot = juce::File{ R"(C:\Users\Joe\source\repos\Reverbulizer\Source\ui\public)"};
        static const auto resourceDirectory = getResourceDirectory();
        const auto resourceToRetrieve = url == "/" ? "index.html" : url.fromFirstOccurrenceOf("/", false, false);

        if (resourceToRetrieve == "outputLevel.json")
        {
            return getPreparedResource("left", audioProcessor.outputLevelLeft.load());
        }

        if (resourceToRetrieve == "freeze.json")
        {
            return getPreparedResource("freeze", audioProcessor.isFrozen);
        }


        if (resourceToRetrieve == "mix.json")
        {
            return getPreparedResource("mix", audioProcessor.mixValue);
        }

        if (resourceToRetrieve == "roomSize.json")
        {
            return getPreparedResource("roomSize", audioProcessor.roomSizeValue);
        }

        if (resourceToRetrieve == "width.json")
        {
            return getPreparedResource("width", audioProcessor.widthValue);
        }

        if (resourceToRetrieve == "damp.json")
        {
            return getPreparedResource("damp", audioProcessor.dampValue);
        }

        if (resourceToRetrieve == "levels.json")
        {
            juce::Array<juce::var> threadSafeLevels;
            {
                const juce::SpinLock::ScopedLockType lock(audioProcessor.fifo.levelsLock);
                if (audioProcessor.fifo.levels.size() != audioProcessor.getScopeSize())
                    return {};
                threadSafeLevels = audioProcessor.fifo.levels;
            }

            return getPreparedResource("levels", threadSafeLevels);
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

        return current.getChildFile("Source/UI/");
    }

    //juce::File getDLLDirectory()
    //{
    //    return juce::File::getSpecialLocation(juce::File::currentExecutableFile)
    //        .getParentDirectory()
    //        // copied WebView2Loader.dll and placed it directly in 
    //        // \Builds\VisualStudio2022\x64\Debug\VST3\3DVerb.vst3\Contents\x86_64-win
    //        .getChildFile("WebView2Loader.dll");
    //}
}
