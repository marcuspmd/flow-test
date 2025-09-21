import React, { useState, useEffect } from "react";
import ViewDetails from "./ViewDetails";
import type { SuiteResult, StepResult } from "../types/dashboard.types";

interface SuiteDetailsModalProps {
  className?: string;
}

const SuiteDetailsModal: React.FC<SuiteDetailsModalProps> = ({
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suiteData, setSuiteData] = useState<SuiteResult | null>(null);

  useEffect(() => {
    const handleOpenModal = (event: CustomEvent) => {
      const { suite } = event.detail;
      setSuiteData(suite);
      setIsOpen(true);
    };

    window.addEventListener(
      "openSuiteDetails",
      handleOpenModal as EventListener
    );

    return () => {
      window.removeEventListener(
        "openSuiteDetails",
        handleOpenModal as EventListener
      );
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setSuiteData(null);
  };

  if (!suiteData) {
    return null;
  }

  return (
    <ViewDetails
      data={suiteData}
      type="suite"
      isOpen={isOpen}
      onClose={handleClose}
      className={className}
    />
  );
};

export default SuiteDetailsModal;
