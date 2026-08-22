type SkillsProps = {
  censusRecords: any[];
  onBackToDashboard: () => void;
};

function Skills({
  censusRecords,
  onBackToDashboard,
}: SkillsProps) {
  return (
    <main className="dashboard-main">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-overline">
            DATA CATEGORY
          </p>

          <h1>Skills</h1>

          <p className="dashboard-description">
            View resident skills and specialties.
          </p>
        </div>

        <button
          type="button"
          className="new-census-button"
          onClick={onBackToDashboard}
        >
          ← Back to Dashboard
        </button>
      </header>

      <section className="dashboard-section">
        <h2>Skills Records</h2>

        <p>
          Total census records: {censusRecords.length}
        </p>
      </section>
    </main>
  );
}

export default Skills;