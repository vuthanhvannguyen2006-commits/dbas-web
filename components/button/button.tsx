"use client";
import styles from "./button.module.css";
type ButtonProps ={
  text: string;
  onClick?: () => void;
}
export default function Button({
  text,
  onClick,
}:ButtonProps) {
  if (!onClick) {
    return <span className={styles.button}>{text}</span>;
  }

  return (
    <button
    type="button"
    onClick={onClick}
    className={styles.button}
    >
      {text}
    </button>  );
}
