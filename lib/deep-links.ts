export const APPLE_TEAM_ID = "F5HPRRCC5H";
export const IOS_BUNDLE_ID = "com.rendezvousil.braddcorp.app";

export function buildAppleAppSiteAssociation() {
  const appID = `${APPLE_TEAM_ID}.${IOS_BUNDLE_ID}`;
  const paths = [
    "/schedule*",
    "/directory*",
    "/account*",
    "/check-in*",
    "/live-updates*",
    "/registration*",
    "/open/*",
  ];
  return {
    applinks: {
      apps: [],
      details: [{ appID, paths }],
    },
    webcredentials: {
      apps: [appID],
    },
  };
}
