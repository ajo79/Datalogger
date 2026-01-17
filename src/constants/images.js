/*
 * images.js
 *
 * Centralized registry for all app images.
 * This prevents crashes due to typos in `require` paths.
 */

const IMAGES = {
    // Navigation & Layout
    WaveTop: require("../../assets/images/WaveTop.png"),
    WaveBottom: require("../../assets/images/WaveBottom.png"),
    BackIcon: require("../../assets/images/BackIcon.png"),
    MoreTop: require("../../assets/images/MoreTop.png"),

    // Tab Icons
    HomeIcon: require("../../assets/images/HomeIcon.png"),
    GraphIcon: require("../../assets/images/GraphIcon.png"),
    AlarmIcon: require("../../assets/images/AlarmIcon.png"),
    MoreIcon: require("../../assets/images/MoreIcon.png"),

    // Functionality Icons
    ProfilePic: require("../../assets/images/Profilepicicon.png"),
    HelpIcon: require("../../assets/images/Help.png"),
    AboutAppIcon: require("../../assets/images/AboutApp.png"),
    LogoutIcon: require("../../assets/images/logout.png"),
    SearchIcon: require("../../assets/images/Search_Icon.png"),
    CalendarIcon: require("../../assets/images/Calender.png"),
    ExportIcon: require("../../assets/images/Export_Icon.png"),

    // Profile & Forms
    NameIcon: require("../../assets/images/NameICON.png"),
    DeptIcon: require("../../assets/images/DeptIcon.png"),
    ContactIcon: require("../../assets/images/ContactIcon.png"),
    EmailIcon: require("../../assets/images/EmailIcon.png"),
    EditIcon: require("../../assets/images/EditICon.png"), // Note critical casing

    // Login
    LogoShield: require("../../assets/images/shield.png"),
    IconEmail: require("../../assets/images/email.png"),
    IconLock: require("../../assets/images/lock.png"),
};

export default IMAGES;
