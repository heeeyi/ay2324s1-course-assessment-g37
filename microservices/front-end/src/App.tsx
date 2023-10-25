import "./App.css";
import { useUserContext } from "./UserContext";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import QuestionBank from "./components/MainQuestionBank";
import ChangePasswordPage from "./components/ChangePasswordPage";
import ChangeDisplayName from "./components/ChangeDisplayName";
import ProfilePage from "./components/ProfilePage";
import Login from "./components/Login";
import Register from "./components/Register";
import { User } from "./components/types";
import React, { useEffect } from "react";
import axios from "axios";
import { Helmet, HelmetProvider } from "react-helmet-async";
import TopBar from "./components/TopBar";
import CollaborationPage from "./components/collaboration/CollaborationPage";
import FindMatchPage from "./components/matching-service/FindMatchPage";
import HomePage from "./components/HomePage";
import SuccessSnackbar from "./components/SuccessSnackbar";
import HistoryPage from "./components/history-service/HistoryPage";
import { useAppDispatch } from "./store/hook";
import { fetchQuestions } from "./store/slices/questionsSlice";
import { fetchHistory } from "./store/slices/historySlice";

// useContext: create a global state, that can be accessed by any component
function App() {
  const dispatch = useAppDispatch();
  const { currentUser, setCurrentUser } = useUserContext();
  // Do this once at App launch. When app launches, all the previous data will be emptied, and useEffect will re-run

  useEffect(() => {
    dispatch(fetchQuestions());
  }, [dispatch]);

  useEffect(() => {
    if (Object.keys(currentUser).length === 0) {
      // initially currentUser = {}
      axios
        .get("/api/auth/current-user")
        .then((response) => {
          const userData: User = response.data;
          setCurrentUser(userData);

          // fetch questions and history again in case need
          if (userData.username) {
            dispatch(fetchQuestions());
            dispatch(fetchHistory(userData.username));
          }
        })
        .catch((error) => {
          console.error("Error fetching current user", error);
        });
    }
  }, [currentUser, setCurrentUser, dispatch]);

  return (
    <HelmetProvider>
      <Helmet>
        <title>PeerPrep</title>
      </Helmet>

      <SuccessSnackbar />

      <Router>
        {Object.keys(currentUser).length === 0 ? (
          <></>
        ) : (
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Register />} />
            <Route path="/" element={<TopBar />}>
              {/* TopBar should appear in all these pages */}
              <Route path="/question-bank" element={<QuestionBank />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
              <Route
                path="/change-display-name"
                element={<ChangeDisplayName />}
              />
              <Route path="/find-match" element={<FindMatchPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route
                path="/collab/:roomId/:difficulty"
                element={<CollaborationPage />}
              />
            </Route>
            <Route path="/*" element={<div>404 Page Not Found</div>} />
          </Routes>
        )}
      </Router>
    </HelmetProvider>
  );
}

export default App;
