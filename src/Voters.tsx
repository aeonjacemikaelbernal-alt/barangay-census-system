type VotersProps = {
  censusRecords: any[];
  onBackToDashboard: () => void;
};

function Voters({
  censusRecords,
  onBackToDashboard,
}: VotersProps) {
  return (
    <main className="dashboard-main">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-overline">
            DATA CATEGORY
          </p>

          <h1>Voters</h1>

          <p className="dashboard-description">
            View voter registration information.
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
        <h2>Voter Records</h2>

        <p>
          Total census records: {censusRecords.length}
        </p>
      </section>
    </main>
  );
}

export default Voters;