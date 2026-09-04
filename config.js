// Road to 75 v0.2.1 configuration.
// These IDs identify the public SPA registration and SharePoint resources.
// They are identifiers, not client secrets. Never add a client secret to this PWA.
window.ROAD_TO_75_CONFIG = {
  syncMode: "microsoft-graph",
  graph: {
    tenantId: "691bfe11-3b95-43a8-8a9e-b298b05ba646",
    clientId: "bed04449-f735-49a7-a1b7-8109d005fcb1",
    redirectUri: "https://carlhadi.github.io/road-to-75-scorekeeper/",
    siteId: "ukomni-my.sharepoint.com,a959b011-5f1d-4fcf-a711-af2a8db8d704,0eaa0a12-9485-4b7e-a2eb-8ad2946006b9",
    scoresListId: "f2ad8467-7458-4b66-843f-ca33f2a118c7",
    contextListId: "62d5e852-c4b2-4547-817a-3d270a6e75ac",
    scopes: ["User.Read", "Sites.ReadWrite.All"]
  }
};
