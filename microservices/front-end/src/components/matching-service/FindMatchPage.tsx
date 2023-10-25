import { useCallback, useEffect, useState } from "react";
import useTimer from "../../hooks/useTimer";
import {
  CancelMatchRequest,
  MatchRequest,
  MatchResponse,
  QuestionComplexity,
} from "../types";
import FindMatchForm from "./FindMatchForm";
import styles from "./FindMatchPage.module.css";
import { useUserContext } from "../../UserContext";
import FindMatchStatus from "./FindMatchStatus";
import useMatchingService from "../../hooks/useMatchingService";
import { useNavigate } from "react-router-dom";

const MAX_WAITING_TIME = 20;

const FindMatchPage: React.FC = () => {
  const { currentUser } = useUserContext();
  const [complexity, setComplexity] = useState<QuestionComplexity>("Easy");
  const {
    timeElapsed,
    isRunning: timerIsRunning,
    start: startTimer,
    reset: resetTimer,
  } = useTimer();
  const navigate = useNavigate();
  const [messageToUser, setMessageToUser] = useState("");

  function joinRoom(allocatedMatch: MatchResponse) {
    navigate(`/collab/${allocatedMatch.roomId}/${allocatedMatch.complexity}`);
  }

  const onMatch = useCallback(
    (match?: MatchResponse) => {
      if (match && timerIsRunning && complexity == match.complexity) {
        setMessageToUser(`Match found! Joining room with ${match.userId}...`);
        joinRoom(match);
      }
    },
    [complexity, timerIsRunning]
  );
  const sendMatchRequest = useMatchingService(onMatch);

  useEffect(() => {
    if (timeElapsed >= MAX_WAITING_TIME) {
      const cancelMatchRequest: CancelMatchRequest = {
        userId: currentUser.username,
        complexity: null,
      };
      sendMatchRequest(cancelMatchRequest);
      resetTimer();
      setMessageToUser("Failed to join match! Try again?");
    }
  }, [currentUser.username, sendMatchRequest, timeElapsed, resetTimer]);

  const toggleSearch = useCallback(
    (newIsSearching: boolean) => {
      if (!newIsSearching) {
        const cancelMatchRequest: CancelMatchRequest = {
          userId: currentUser.username,
          complexity: null,
        };
        sendMatchRequest(cancelMatchRequest);
        resetTimer();
        setMessageToUser("");
        return;
      }
      const matchRequest: MatchRequest = {
        userId: currentUser.username,
        complexity: complexity,
      };
      sendMatchRequest(matchRequest);
      startTimer();
      setMessageToUser("Finding suitable match");
    },
    [currentUser.username, complexity, startTimer, resetTimer, sendMatchRequest]
  );

  return (
    <>
      <div className={styles.header_container}>
        <h1>Find Match</h1>
      </div>
      <FindMatchForm
        complexity={complexity}
        setComplexity={setComplexity}
        isSearching={timerIsRunning}
        setIsSearching={toggleSearch}
      />
      <FindMatchStatus
        messageToUser={`${messageToUser}${".".repeat(timeElapsed % 4)}`}
        timeElapsed={timeElapsed}
        timerIsRunning={timerIsRunning}
      />
    </>
  );
};
export default FindMatchPage;
