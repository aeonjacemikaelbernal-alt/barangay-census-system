type EducationProps = {
  censusRecords: any[];
  onBackToDashboard: () => void;
};

function Education({
  censusRecords,
  onBackToDashboard,
}: EducationProps) {
  const safeRecords = Array.isArray(censusRecords)
    ? censusRecords.filter(Boolean)
    : [];

  const allResidents = safeRecords.flatMap(
    (record: any) => {
      const families = Array.isArray(record?.families)
        ? record.families
        : [];

      return families.flatMap((family: any) => {
        const members = Array.isArray(family?.members)
          ? family.members
          : [];

        return members.map((member: any) => ({
          ...member,
          householdNumber:
            record?.householdNumber || "—",
          familyName:
            family?.familyName || "Unnamed Family",
        }));
      });
    }
  );

  return (
    <main
      style={{
        flex: 1,
        padding: "34px 42px",
        background: "#f5f7fb",
        minHeight: "100vh",
      }}
    >

      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >

        <div>

          <p
            style={{
              margin: "0 0 7px",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.13em",
              color: "#7e8a9f",
            }}
          >
            BARANGAY MANAGEMENT SYSTEM
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: "32px",
              color: "#172033",
            }}
          >
            Education
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#758094",
              fontSize: "14px",
            }}
          >
            View educational information of all registered residents.
          </p>

        </div>

        <button
          onClick={onBackToDashboard}
          style={{
            border: "1px solid #dfe4eb",
            background: "white",
            borderRadius: "10px",
            padding: "11px 18px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          ← Back to Dashboard
        </button>

      </div>

      {/* TOTAL */}

      <div
        style={{
          marginBottom: "20px",
          color: "#758094",
          fontSize: "14px",
        }}
      >
        Total residents:{" "}
        <strong>
          {allResidents.length}
        </strong>
      </div>

      {/* RECORDS */}

      {allResidents.length === 0 ? (

        <div
          style={{
            background: "white",
            border: "1px solid #e7eaf0",
            borderRadius: "14px",
            padding: "50px",
            textAlign: "center",
          }}
        >

          <h3>
            No education records yet
          </h3>

          <p>
            Education information will appear here after
            a census is submitted.
          </p>

        </div>

      ) : (

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "16px",
          }}
        >

          {allResidents.map(
            (resident: any, index: number) => {

              const fullName = [
                resident?.firstName,
                resident?.middleName,
                resident?.lastName,
                resident?.suffix,
              ]
                .filter(Boolean)
                .join(" ");

              return (

                <div
                  key={index}
                  style={{
                    background: "white",
                    border: "1px solid #e7eaf0",
                    borderRadius: "14px",
                    padding: "22px",
                  }}
                >

                  <h3
                    style={{
                      margin: "0 0 5px",
                      fontSize: "17px",
                    }}
                  >
                    {fullName || "Unnamed Resident"}
                  </h3>

                  <p
                    style={{
                      margin: "0 0 18px",
                      color: "#8993a5",
                      fontSize: "12px",
                    }}
                  >
                    Family: {resident?.familyName}
                    {" · "}
                    Household: {resident?.householdNumber}
                  </p>

                  <div
                    style={{
                      borderTop:
                        "1px solid #eef0f4",
                      paddingTop: "16px",
                    }}
                  >

                    <p>
                      <strong>
                        Education:
                      </strong>{" "}
                      {resident?.education || "—"}
                    </p>

                    <p>
                      <strong>
                        School Status:
                      </strong>{" "}
                      {resident?.schoolStatus || "—"}
                    </p>

                    <p>
                      <strong>
                        School Level:
                      </strong>{" "}
                      {resident?.schoolLevel || "—"}
                    </p>

                    <p>
                      <strong>
                        Elementary School:
                      </strong>{" "}
                      {resident?.elementarySchool || "—"}
                    </p>

                    <p>
                      <strong>
                        Junior High School:
                      </strong>{" "}
                      {resident?.juniorHighSchool || "—"}
                    </p>

                    <p>
                      <strong>
                        Senior High School:
                      </strong>{" "}
                      {resident?.seniorHighSchool || "—"}
                    </p>

                    <p>
                      <strong>
                        College / University:
                      </strong>{" "}
                      {resident?.collegeUniversity || "—"}
                    </p>

                    <p>
                      <strong>
                        Course:
                      </strong>{" "}
                      {resident?.course || "—"}
                    </p>

                  </div>

                </div>

              );
            }
          )}

        </div>

      )}

    </main>
  );
}

export default Education;