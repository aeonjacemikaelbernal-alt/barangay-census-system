import { useState } from "react";

import {
  UsersRound,
  Users,
  ArrowLeft,
} from "lucide-react";

type FamiliesProps = {
  censusRecords: any[];
  onBackToDashboard: () => void;
};

function Families({
  censusRecords,
  onBackToDashboard,
}: FamiliesProps) {

 

  const [selectedFamily, setSelectedFamily] =
  useState<any | null>(null);

  const safeRecords = Array.isArray(censusRecords)
    ? censusRecords.filter(Boolean)
    : [];

  const allFamilies = safeRecords.flatMap(
    (record: any) =>
      Array.isArray(record?.families)
        ? record.families.map((family: any) => ({
            ...family,
            householdNumber:
              record?.householdNumber || "—",
            household:
              record?.household || {},
          }))
        : []
  );
if (selectedFamily) {
  const members = Array.isArray(
    selectedFamily?.members
  )
    ? selectedFamily.members
    : [];
  return (
    <main
      style={{
        flex: 1,
        padding: "34px 42px",
        background: "#f5f7fb",
        minHeight: "100vh",
      }}
    >
      <button
        onClick={() => setSelectedFamily(null)}
        style={{
          border: "1px solid #dfe4eb",
          background: "white",
          borderRadius: "10px",
          padding: "11px 18px",
          cursor: "pointer",
          fontWeight: 600,
          marginBottom: "25px",
        }}
      >
        <span
  style={{
    display: "flex",
    alignItems: "center",
    gap: "8px",
  }}
>
  <ArrowLeft size={17} strokeWidth={1.8} />
  Back to Families
</span>
      </button>

      <h1
        style={{
          margin: 0,
          fontSize: "32px",
          color: "#172033",
        }}
      >
        {selectedFamily?.familyName ||
          "Unnamed Family"}
      </h1>

      <p
        style={{
          color: "#758094",
          fontSize: "14px",
        }}
      >
        Household {selectedFamily?.householdNumber || "—"}
      </p>

      <div
        style={{
          marginTop: "25px",
          background: "white",
          border: "1px solid #e7eaf0",
          borderRadius: "14px",
          padding: "22px",
        }}
      >
        <h3>Family Members</h3>

        {members.length === 0 ? (
          <p>No members recorded.</p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {members.map(
              (member: any, index: number) => {
                const fullName = [
                  member?.firstName,
                  member?.middleName,
                  member?.lastName,
                  member?.suffix,
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <div
                    key={index}
                    style={{
                      padding: "14px",
                      background: "#f8fafc",
                      borderRadius: "9px",
                    }}
                  >
                    <strong>
                      {fullName ||
                        "Unnamed Resident"}
                    </strong>

                    <div
                      style={{
                        marginTop: "5px",
                        fontSize: "12px",
                        color: "#8993a5",
                      }}
                    >
                      <div
  style={{
    marginTop: "8px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "8px",
  }}
>
  <div>
    <span
      style={{
        display: "block",
        fontSize: "10px",
        color: "#8993a5",
        fontWeight: 600,
      }}
    >
      SEX
    </span>

    <span>
      {member?.sex || "—"}
    </span>
  </div>

  <div>
    <span
      style={{
        display: "block",
        fontSize: "10px",
        color: "#8993a5",
        fontWeight: 600,
      }}
    >
      CIVIL STATUS
    </span>

    <span>
      {member?.civilStatus || "—"}
    </span>
  </div>

  <div>
    <span
      style={{
        display: "block",
        fontSize: "10px",
        color: "#8993a5",
        fontWeight: 600,
      }}
    >
      BIRTH DATE
    </span>

    <span>
      {member?.birthDate || "—"}
    </span>
  </div>

  <div>
    <span
      style={{
        display: "block",
        fontSize: "10px",
        color: "#8993a5",
        fontWeight: 600,
      }}
    >
      OCCUPATION
    </span>

    <span>
      {member?.primaryOccupation || "—"}
    </span>
  </div>

  <div>
    <span
      style={{
        display: "block",
        fontSize: "10px",
        color: "#8993a5",
        fontWeight: 600,
      }}
    >
      EMPLOYMENT
    </span>

    <span>
      {member?.employmentStatus || "—"}
    </span>
  </div>

  <div>
    <span
      style={{
        display: "block",
        fontSize: "10px",
        color: "#8993a5",
        fontWeight: 600,
      }}
    >
      MONTHLY INCOME
    </span>

    <span>
      {member?.monthlyIncome || "—"}
    </span>
  </div>

  <div>
    <span
      style={{
        display: "block",
        fontSize: "10px",
        color: "#8993a5",
        fontWeight: 600,
      }}
    >
      VOTER STATUS
    </span>

    <span>
      {member?.voterStatus || "—"}
    </span>
  </div>

  <div>
    <span
      style={{
        display: "block",
        fontSize: "10px",
        color: "#8993a5",
        fontWeight: 600,
      }}
    >
      4Ps MEMBER
    </span>

    <span>
      {member?.fourPsMember || "—"}
    </span>
  </div>
</div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </main>
  );
}
  return (
    <main
      style={{
        flex: 1,
        padding: "34px 42px",
        background: "#f5f7fb",
        minHeight: "100vh",
      }}
    >
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
            Families
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#758094",
              fontSize: "14px",
            }}
          >
            View all registered families and their members.
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

      <div
        style={{
          marginBottom: "20px",
          color: "#758094",
          fontSize: "14px",
        }}
      >
        Total families:{" "}
        <strong>{allFamilies.length}</strong>
      </div>

      {allFamilies.length === 0 ? (
        <div
          style={{
            background: "white",
            border: "1px solid #e7eaf0",
            borderRadius: "14px",
            padding: "50px",
            textAlign: "center",
          }}
        >
          <h3>No family records yet</h3>

          <p>
            Family records will appear here after a census
            is submitted.
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
          {allFamilies.map(
            (family: any, index: number) => {
              const members = Array.isArray(
                family?.members
              )
                ? family.members
                : [];

              return (
  <div
    key={
      family?.id ??
      `${family?.householdNumber}-${index}`
    }
    onClick={() => {
      setSelectedFamily(family);
    }}
    style={{
      background: "white",
      border: "1px solid #e7eaf0",
      borderRadius: "14px",
      padding: "22px",
      cursor: "pointer",
    }}
  >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "18px",
                    }}
                  >
                    <div
  style={{
    width: "45px",
    height: "45px",
    borderRadius: "11px",
    background: "#f0f4f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
  }}
>
  <UsersRound size={21} strokeWidth={1.8} />
</div>
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "17px",
                        }}
                      >
                        {family?.familyName ||
                          "Unnamed Family"}
                      </h3>

                      <span
                        style={{
                          color: "#8993a5",
                          fontSize: "12px",
                        }}
                      >
                        Household{" "}
                        {family?.householdNumber}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop:
                        "1px solid #eef0f4",
                      paddingTop: "16px",
                    }}
                  >
                    <strong
                      style={{
                        fontSize: "12px",
                        color: "#8993a5",
                      }}
                    >
                      FAMILY MEMBERS
                    </strong>

                    <div
                      style={{
                        marginTop: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      {members.map(
                        (
                          member: any,
                          memberIndex: number
                        ) => {
                          const fullName = [
                            member?.firstName,
                            member?.middleName,
                            member?.lastName,
                            member?.suffix,
                          ]
                            .filter(Boolean)
                            .join(" ");

                          return (
                            <button
  key={memberIndex}
  type="button"
  onClick={(event) => {
  event.stopPropagation();

  console.log("RESIDENT DETAILS:", {
    name: fullName || "Unnamed Resident",
    sex: member?.sex || "—",
    civilStatus: member?.civilStatus || "—",
    birthDate: member?.birthDate || "—",
    occupation: member?.primaryOccupation || "—",
    employment: member?.employmentStatus || "—",
    monthlyIncome: member?.monthlyIncome || "—",
    voterStatus: member?.voterStatus || "—",
    fourPsMember: member?.fourPsMember || "—",
  });
}}
  style={{
    width: "100%",
    padding: "11px 13px",
    background: "#f8fafc",
    border: "1px solid transparent",
    borderRadius: "9px",
    textAlign: "left",
    cursor: "pointer",
  }}
>
  <strong
    style={{
      display: "block",
      fontSize: "14px",
    }}
  >
    {fullName || "Unnamed Resident"}
  </strong>

  <span
    style={{
      display: "block",
      marginTop: "3px",
      fontSize: "11px",
      color: "#8993a5",
    }}
  >
    {member?.sex || "—"}
    {" · "}
    {member?.civilStatus || "—"}
  </span>
</button>
                          );
                        }
                      )}
                    </div>
                  </div>

                  <div
  style={{
    marginTop: "16px",
    paddingTop: "14px",
    borderTop: "1px solid #eef0f4",
    fontSize: "13px",
    color: "#758094",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  }}
>
                    <Users size={16} strokeWidth={1.8} />
                    <strong>
                      {members.length}
                    </strong>{" "}
                    member
                    {members.length !== 1
                      ? "s"
                      : ""}
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

export default Families;