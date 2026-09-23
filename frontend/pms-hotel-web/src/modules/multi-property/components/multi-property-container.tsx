"use client";

import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { MultiPropertyDashboard } from "./multi-property-dashboard";
import { AvailabilitySearch } from "./availability-search";
import { AvailabilityResults } from "./availability-results";
import { RebookingEvaluate } from "./rebooking-evaluate";
import { RebookingApplied } from "./rebooking-applied";
import styles from "./multi-property.module.css";
import { MultiPropertyView } from "../types";

export function MultiPropertyContainer() {
  const [currentView, setCurrentView] = useState<MultiPropertyView>("dashboard");

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <MultiPropertyDashboard onNavigate={setCurrentView} />;
      case "search":
        return <AvailabilitySearch onNavigate={setCurrentView} />;
      case "results":
        return <AvailabilityResults onNavigate={setCurrentView} />;
      case "evaluate":
        return <RebookingEvaluate onNavigate={setCurrentView} />;
      case "applied":
        return <RebookingApplied onNavigate={setCurrentView} />;
      default:
        return <MultiPropertyDashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className={styles.layoutContainer}>
      <Sidebar />
      <main className={styles.mainContent}>
        {renderView()}
      </main>
    </div>
  );
}
