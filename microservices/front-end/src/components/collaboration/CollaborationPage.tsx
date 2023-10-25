import { useEffect, useState } from "react";
import io, { Socket } from "socket.io-client";
import Editor from "./Editor";
import {
  Box,
  Button,
  CircularProgress,
  Modal,
  Typography,
} from "@mui/material";
import classes from "./CollaborationPage.module.css";
import { useNavigate, useParams } from "react-router-dom";
import CollabQuestionPage from "./CollabQuestionPage";
import { QuestionComplexity } from "../types";

function CollaborationPage() {
  const COLLAB_SERVICE_URL = "http://localhost:3111";
  const navigate = useNavigate();
  const { roomId, difficulty } = useParams();
  const [socket, setSocket] = useState<Socket>();
  const [modalText, setModalText] = useState<string>("");

  const handleEndSession = () => {
    if (!socket) return;
    socket.disconnect();
    navigate("/find-match");
  };

  useEffect(() => {
    const socket = io(COLLAB_SERVICE_URL, { query: { roomId: roomId } });
    socket.on("connect", () => {
      console.log("connected");
    });
    socket.on("room count", (count) => {
      if (count === 1) {
        setModalText("Waiting for the other user.");
      } else {
        setModalText("");
      }
    });
    setSocket(socket);

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <>
      <Modal open={!!modalText}>
        <Box className={classes.modal}>
          <Typography variant="h5" style={{}}>
            {modalText}
          </Typography>
          {modalText === "Waiting for the other user." && (
            <>
              <CircularProgress />
              <Button
                variant="contained"
                onClick={() => navigate("/find-match")}
              >
                {" "}
                Go back to home page
              </Button>
            </>
          )}
        </Box>
      </Modal>
      <div style={{ display: "flex" }}>
        <CollabQuestionPage difficulty={difficulty as QuestionComplexity} />
        <Editor socket={socket} />
      </div>
      <Button
        variant="contained"
        onClick={handleEndSession}
        style={{ position: "fixed", bottom: "20px", right: "20px" }}
      >
        End session
      </Button>
    </>
  );
}

export default CollaborationPage;
