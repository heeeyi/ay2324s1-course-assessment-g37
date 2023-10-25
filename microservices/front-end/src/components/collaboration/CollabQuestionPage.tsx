import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../../store/hook";
import { selectSortedFilteredQuestions } from "../../store/slices/questionFilterSlice";
import CollabQuestion from "./CollabQuestion";
import { QuestionComplexity } from "../types";
import { resetAndSetDifficulty } from "../../store/slices/questionFilterSlice";

interface CollabQuestionPageProps {
  difficulty: QuestionComplexity;
}

const CollabQuestionPage: React.FC<CollabQuestionPageProps> = ({
  difficulty,
}) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(resetAndSetDifficulty(difficulty));
  }, [dispatch, difficulty]);

  const sortedQuestions = useAppSelector(selectSortedFilteredQuestions);

  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null
  );

  const toggleQuestionDetails = (id: string) => {
    setExpandedQuestionId(expandedQuestionId === id ? null : id);
  };

  return (
    <>
      <CollabQuestion
        questions={sortedQuestions}
        expandedQuestionId={expandedQuestionId}
        toggleQuestionDetails={toggleQuestionDetails}
      />
    </>
  );
};

export default CollabQuestionPage;
