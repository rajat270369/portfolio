// FRAUD-X NEXUS-9 station manifest. World-space positions match the uploaded
// FRAUDX_NEXUS9_ALL_9_CRYSTALS.glb after the chamber's 180-degree Y rotation.
// Geometry and crystal placements are already baked into the GLB: DO NOT move
// the station objects again in React.
export const CHAMBER_CENTER_Z = -11.63;
export const TOUR_START = 0.55;
export const TOUR_END = 1;
export const TOUR_SPAN = (TOUR_END - TOUR_START) / 9;
export const WALK_PORTION = 0.62;

export const STATIONS = [
  {
    id: 1, crystal: 'Aquamarine', name: 'Transaction Analysis', colorName: 'Cyan',
    tone: '#67e4e7', world: [4.133217, -15.910072],
    wrapper: 'FX_INSTALLED_STATION_01_TRANSACTION_ANALYSIS',
    operationStatus: 'Rule-based assessment implemented',
    summary: 'Evaluate individual transactions with the existing Java rule engine and explore the future ML risk-scoring roadmap.',
    current: 'React transaction form, Java Spring Boot REST API, amount/location-based INVALID, HIGH RISK, REVIEW and LOW RISK classifications, and repository save operation.',
    future: 'ML fraud probability, behavioral anomaly signals, explainable predictions, and calibrated risk scoring.',
    technologies: 'React · Three.js · Java · Spring Boot · REST APIs',
  },
  {
    id: 2, crystal: 'Sapphire Aegis', name: 'Threat Overview', colorName: 'Royal blue',
    tone: '#80a7ff', world: [0, -17.58],
    wrapper: 'FX_INSTALLED_STATION_02_THREAT_OVERVIEW',
    operationStatus: 'Analytics dashboard planned',
    summary: 'A planned threat-intelligence dashboard for risk categories, alerts and changing fraud patterns.',
    current: 'Completed Sapphire Aegis 3D GLB, dedicated Command Centre station, and conceptual information display.',
    future: 'Risk-category summaries, event severity charts, high-risk transaction counts, alert triage and trend analytics.',
    technologies: 'React · Visual analytics · Spring Boot · Charts (planned)',
  },
  {
    id: 3, crystal: 'Amber Reactor', name: 'Live Monitor', colorName: 'Orange',
    tone: '#ffb15d', world: [-4.133217, -15.910072],
    wrapper: 'FX_INSTALLED_STATION_03_LIVE_MONITOR',
    operationStatus: 'Real-time stream planned',
    summary: 'A live-monitoring concept for streaming transaction activity and unusual-behavior alerts.',
    current: 'Completed Amber Reactor 3D GLB installed on Station 03.',
    future: 'Streaming feeds, WebSocket notifications, fraud event timelines, and dynamic risk updates.',
    technologies: 'React · WebSockets · Spring Boot · Streaming (planned)',
  },
  {
    id: 4, crystal: 'Frost Quartz', name: 'Transaction Explorer', colorName: 'Ice blue',
    tone: '#a8edff', world: [5.747259, -13.169973],
    wrapper: 'FX_INSTALLED_STATION_04_TRANSACTION_EXPLORER',
    operationStatus: 'Search interface planned',
    summary: 'A searchable investigation interface for browsing historical transaction assessments.',
    current: 'Completed Frost Quartz GLB installed on Station 04.',
    future: 'Search, sorting, filters, pagination, transaction history and detailed records.',
    technologies: 'React · Spring Boot · Database queries (planned)',
  },
  {
    id: 5, crystal: 'Ruby Sentinel', name: 'Investigation Centre', colorName: 'Crimson',
    tone: '#ff7484', world: [-5.747259, -13.169973],
    wrapper: 'FX_INSTALLED_STATION_05_INVESTIGATION_CENTRE',
    operationStatus: 'Case management planned',
    summary: 'An analyst workspace for reviewing suspicious activity and managing investigation evidence.',
    current: 'Completed Ruby Sentinel GLB installed on Station 05.',
    future: 'Case tracking, evidence review, analyst notes, status updates and AI-assisted summaries.',
    technologies: 'React · Case management · Secure APIs · AI assistance (planned)',
  },
  {
    id: 6, crystal: 'Amethyst Nexus', name: 'Network Intelligence', colorName: 'Violet',
    tone: '#b394ff', world: [5.77326, -10.190565],
    wrapper: 'FX_INSTALLED_STATION_06_NETWORK_INTELLIGENCE',
    operationStatus: 'Network analytics planned',
    summary: 'A graph-intelligence workspace for investigating relationships between senders, receivers and transaction clusters.',
    current: 'Completed Amethyst Nexus GLB and dedicated Command Centre station.',
    future: 'Interactive account graphs, suspicious transaction communities and graph-based anomaly detection.',
    technologies: 'React · Graph visualization · Network ML (planned)',
  },
  {
    id: 7, crystal: 'Citrine Oracle', name: 'Model Intelligence Lab', colorName: 'Gold',
    tone: '#f0ce6b', world: [-5.77326, -10.190565],
    wrapper: 'FX_INSTALLED_STATION_07_MODEL_INTELLIGENCE_LAB',
    operationStatus: 'Model evaluation planned',
    summary: 'A future ML laboratory for evaluating, monitoring and explaining fraud models.',
    current: 'Completed Citrine Oracle GLB installed on Station 07.',
    future: 'Precision, recall, F1, PR-AUC, confusion matrices, SHAP explanations and model comparisons.',
    technologies: 'Python · scikit-learn · SHAP · ML tracking (planned)',
  },
  {
    id: 8, crystal: 'Emerald Archive', name: 'Reports & Intelligence', colorName: 'Emerald green',
    tone: '#6deda6', world: [4.133217, -7.349928],
    wrapper: 'FX_INSTALLED_STATION_08_REPORTS_INTELLIGENCE',
    operationStatus: 'Report generation planned',
    summary: 'A reporting workspace for trend analysis, intelligence summaries and exports.',
    current: 'Completed Emerald Archive GLB installed on Station 08.',
    future: 'Risk trends, PDF/CSV exports, historical dashboards and executive summaries.',
    technologies: 'React · Reporting · Analytics · Exports (planned)',
  },
  {
    id: 9, crystal: 'Opal Singularity', name: 'Preferences', colorName: 'Pearl lavender',
    tone: '#d6b7ff', world: [-4.133217, -7.349928],
    wrapper: 'FX_INSTALLED_STATION_09_PREFERENCES',
    operationStatus: 'Settings workspace planned',
    summary: 'Configuration of thresholds, notification choices and command-centre accessibility settings.',
    current: 'Completed Opal Singularity GLB installed on Station 09.',
    future: 'Fraud thresholds, notifications, accessibility, user roles and secure audit trails.',
    technologies: 'React · Spring Boot · Access control · Settings (planned)',
  },
];

export const smooth = (t) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};
export const stationIndexAt = (p) => Math.max(0, Math.min(8, Math.floor((p - TOUR_START) / TOUR_SPAN)));
export const stopProgress = (id) => Math.min(0.998, TOUR_START + TOUR_SPAN * ((id - 1) + 0.81));

// Return a continuous camera/character orbit around the central reactor.
// Angular movement follows the shortest ring arc, NOT a straight chord
// through the reactor. The first leg starts at the entrance and eases out.
export function tourPose(p) {
  const index = stationIndexAt(p);
  const local = Math.min(1, Math.max(0, (p - TOUR_START - index * TOUR_SPAN) / TOUR_SPAN));
  const current = STATIONS[index];
  const previous = STATIONS[index - 1];
  const originAngle = previous
    ? Math.atan2(previous.world[1] - CHAMBER_CENTER_Z, previous.world[0])
    : Math.PI / 2;
  const destAngle = Math.atan2(current.world[1] - CHAMBER_CENTER_Z, current.world[0]);
  const angleDistance = Math.atan2(Math.sin(destAngle - originAngle), Math.cos(destAngle - originAngle));
  const movingT = smooth(local / WALK_PORTION);
  const angle = originAngle + angleDistance * movingT;
  const rAvatar = index === 0 ? 2.07 + (3.87 - 2.07) * movingT : 3.87;
  const tangentOffset = index === 0 ? (-0.10 * movingT) : -0.10;
  const avatarAngle = angle + tangentOffset;
  const avatar = [rAvatar * Math.cos(avatarAngle), 0,
    CHAMBER_CENTER_Z + rAvatar * Math.sin(avatarAngle)];
  // Close-up must start AND end at zero at each station boundary.
  // The previous version jumped from max zoom to no zoom when the station
  // index changed, causing a visible camera/FOV snap.
  const focusIn = smooth((local - 0.42) / 0.26);
  const focusOut = 1 - smooth((local - 0.86) / 0.14);
  const focus = focusIn * focusOut;
  const normalCameraRadius = index === 0 ? 3.33 + (3.08 - 3.33) * movingT : 3.08;
  // At each station, drift a little closer and sideways for a better
  // unobstructed view of the crystal; preserve the original walk orbit.
  const cameraRadius = normalCameraRadius + focus * 0.38;
  const cameraAngle = angle + focus * 0.11;
  const eyeHeight = (index === 0 ? 3.32 + (2.53 - 3.32) * movingT : 2.53) + focus * 0.10;
  const eye = [cameraRadius * Math.cos(cameraAngle), eyeHeight,
    CHAMBER_CENTER_Z + cameraRadius * Math.sin(cameraAngle)];
  const outwardLook = [5.95 * Math.cos(angle), 2.2,
    CHAMBER_CENTER_Z + 5.95 * Math.sin(angle)];
  const look = index === 0
    ? [outwardLook[0] * movingT, 2.26 + (2.2 - 2.26) * movingT,
      CHAMBER_CENTER_Z + (outwardLook[2] - CHAMBER_CENTER_Z) * movingT]
    : outwardLook;
  const headingWalk = Math.atan2(
    -Math.sin(angle) * Math.sign(angleDistance),
    Math.cos(angle) * Math.sign(angleDistance));
  const headingStation = Math.atan2(Math.cos(angle), Math.sin(angle));
  const headingDelta = Math.atan2(Math.sin(headingStation - headingWalk), Math.cos(headingStation - headingWalk));
  const previousHeading = index === 0
    ? Math.PI
    : Math.atan2(Math.cos(originAngle), Math.sin(originAngle));
  const startTurn = Math.atan2(Math.sin(headingWalk - previousHeading), Math.cos(headingWalk - previousHeading));
  const enterWalk = smooth(local / 0.15);
  const exitWalk = smooth((local - WALK_PORTION * 0.75) / (WALK_PORTION * 0.25));
  const yaw = previousHeading + startTurn * enterWalk + headingDelta * exitWalk;
  return { index, local, moving: local < WALK_PORTION, eye, look, avatar, yaw, focus, station: current };
}
