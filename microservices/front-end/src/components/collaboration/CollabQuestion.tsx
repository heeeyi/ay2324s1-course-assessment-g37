import React from "react";
import { Question } from "../types";
import styles from "./CollabQuestion.module.css";

interface CollabQuestionProps {
  questions: Question[];
  expandedQuestionId: string | null;
  toggleQuestionDetails: (id: string) => void;
}

const CollabQuestion: React.FC<CollabQuestionProps> = ({
  questions,
  expandedQuestionId,
  toggleQuestionDetails,
}) => {
  return (
    <table className={styles.table_container}>
      <thead>
        <tr>
          <th className={`${styles.table_header} ${styles.title}`}>Title</th>
          <th className={`${styles.table_header} ${styles.category}`}>
            Category
          </th>
        </tr>
      </thead>
      <tbody>
        {questions.map((question) => (
          <React.Fragment key={question._id}>
            <tr>
              <td>
                <button
                  className={styles.category_button}
                  onClick={() => toggleQuestionDetails(question._id)}
                >
                  {question.title}
                </button>
              </td>
              <td className={styles.center_align_cell}>
                {question.categories.join(", ")}
              </td>
            </tr>
            {expandedQuestionId === question._id && (
              <tr>
                <td colSpan={4}>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: question.description,
                    }}
                  ></div>
                </td>
              </tr>
            )}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
};

export default CollabQuestion;
