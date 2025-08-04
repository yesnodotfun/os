import { useState, useEffect, useCallback } from "react";
import { Editor } from "@tiptap/core";
import { useTtsQueue } from "@/hooks/useTtsQueue";
import { speechHighlightKey } from "../extensions/SpeechHighlight";

interface SpeechManagerProps {
  editor: Editor | null;
  speechEnabled: boolean;
  children: (props: {
    isSpeaking: boolean;
    isTtsLoading: boolean;
    handleSpeak: () => void;
  }) => React.ReactNode;
}

export function SpeechManager({ editor, speechEnabled, children }: SpeechManagerProps) {
  const { speak, stop, isSpeaking } = useTtsQueue();
  const [isTtsLoading, setIsTtsLoading] = useState(false);

  // When speech starts, clear the loading state
  useEffect(() => {
    if (isSpeaking) {
      setIsTtsLoading(false);
    }
  }, [isSpeaking]);

  const handleSpeak = useCallback(() => {
    if (!editor || !speechEnabled) return;

    // Helper to highlight an editor range using the decoration plugin
    const highlightRange = (from: number, to: number) => {
      const { state, view } = editor;
      const tr = state.tr.setMeta(speechHighlightKey, { range: { from, to } });
      view.dispatch(tr);
    };

    // Helper to clear any existing highlight
    const clearHighlight = () => {
      const { state, view } = editor;
      const tr = state.tr.setMeta(speechHighlightKey, { clear: true });
      view.dispatch(tr);
    };

    // If currently speaking, clicking stops playback
    if (isSpeaking) {
      stop();
      clearHighlight();
      return;
    }

    // If we are already waiting for TTS response, cancel it on second click
    if (isTtsLoading) {
      stop();
      setIsTtsLoading(false);
      return;
    }

    const { from, to, empty } = editor.state.selection;

    if (empty) {
      // Collect all textblock nodes with their positions so we can highlight
      const blocks: { text: string; from: number; to: number }[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.isTextblock && node.textContent.trim()) {
          const from = pos + 1; // +1 to skip the opening tag
          const to = pos + node.nodeSize - 1; // -1 to skip the closing tag
          blocks.push({
            text: node.textContent.trim(),
            from,
            to,
          });
        }
      });

      if (blocks.length === 0) return;

      setIsTtsLoading(true);

      // Queue every block immediately so network fetches start in parallel
      blocks.forEach(({ text }, idx) => {
        speak(text, () => {
          const nextIdx = idx + 1;
          if (nextIdx < blocks.length) {
            const nextBlock = blocks[nextIdx];
            clearHighlight();
            highlightRange(nextBlock.from, nextBlock.to);
          } else {
            clearHighlight();
          }
        });
      });

      // Highlight the first block right away
      const { from: firstFrom, to: firstTo } = blocks[0];
      highlightRange(firstFrom, firstTo);
    } else {
      // Speak the selected text as-is
      const textToSpeak = editor.state.doc.textBetween(from, to, "\n").trim();
      if (textToSpeak) {
        setIsTtsLoading(true);

        // Highlight the selection
        highlightRange(from, to);

        speak(textToSpeak, () => {
          clearHighlight();
        });
      }
    }
  }, [editor, speechEnabled, isSpeaking, isTtsLoading, speak, stop]);

  return (
    <>
      {children({
        isSpeaking,
        isTtsLoading,
        handleSpeak,
      })}
    </>
  );
}