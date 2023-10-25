import { Socket } from "socket.io-client";
import classes from "./CollaborationPage.module.css";
import { useEffect, useState } from "react";
import Quill, { TextChangeHandler } from "quill";
import "quill/dist/quill.snow.css";

interface EditorProps {
  socket: Socket | undefined;
}

function Editor({ socket }: EditorProps) {
  const [quill, setQuill] = useState<Quill>();

  const TOOLBAR_OPTIONS = [
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    ["code-block"],
    ["clean"],
  ];

  useEffect(() => {
    if (!socket) return;
    var editor = new Quill("#editor", {
      theme: "snow",
      modules: {
        toolbar: TOOLBAR_OPTIONS,
      },
      placeholder: "Write your code here...",
      scrollingContainer: "#scrolling-container",
    });

    socket.on("room count", (count) => {
      if (count === 1) {
        editor.disable();
        // editor.setText("Waiting for another user...");
      } else {
        editor.enable();
      }
    });

    socket.on("request code", (id) => {
      socket.emit("send code", id, editor.getContents());
    });

    socket.on("receive code", (delta) => {
      console.log(delta);
      editor.setContents(delta);
    });

    const textChangeHandler: TextChangeHandler = (
      delta,
      oldContents,
      source
    ) => {
      if (source !== "user") return;
      socket.emit("client code changes", delta);
    };

    editor.on("text-change", textChangeHandler);
    socket.on("server code changes", (delta) => {
      editor.off("text-change", textChangeHandler);
      editor.updateContents(delta);
      editor.on("text-change", textChangeHandler);
    });

    setQuill(editor);
  }, [socket]);
  return (
    <div id="scrolling-container" className={classes.scrollingContainer}>
      <div id="editor" className={classes.editor} />
    </div>
  );
}

export default Editor;
