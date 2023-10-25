import hljs from "highlight.js";
import "highlight.js/styles/atom-one-dark.css";
import Quill, { TextChangeHandler } from "quill";
import "quill/dist/quill.snow.css";
import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import classes from "./CollaborationPage.module.css";

interface EditorProps {
  socket: Socket | undefined;
}

function Editor({ socket }: EditorProps) {
  const [, setQuill] = useState<Quill | null>();

  useEffect(() => {
    if (socket === undefined) {
      return;
    }

    const editor = new Quill("#editor", {
      theme: "snow",
      modules: {
        toolbar: [["code-block"]],
        syntax: {
          highlight: (text: string) => {
            return hljs.highlight(text, { language: "javascript" }).value;
          },
        },
      },
      placeholder: "Write your code here...",
      scrollingContainer: "#scrolling-container",
    });

    socket.on("room count", (count) => {
      if (count == 2) {
        editor.enable();
      } else {
        editor.disable();
      }
    });

    socket.on("request code", (id) => {
      socket.emit("send code", id, editor.getContents());
    });

    socket.on("receive code", (delta) => {
      editor.setContents(delta);
    });

    const textChangeHandler: TextChangeHandler = (
      delta,
      oldContents,
      source
    ) => {
      if (source === "user") {
        socket.emit("client code changes", delta);
      }
    };

    editor.on("text-change", textChangeHandler);

    socket.on("server code changes", (delta) => {
      editor.off("text-change", textChangeHandler);
      editor.updateContents(delta);
      editor.on("text-change", textChangeHandler);
    });

    setQuill(editor);

    // cleanup
    return () => setQuill(null);
  }, [socket]);

  return (
    <div id="scrolling-container" className={classes.scrollingContainer}>
      <div id="editor" className={classes.editor} />
    </div>
  );
}

export default Editor;
