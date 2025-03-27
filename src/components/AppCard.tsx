import { Box, Card, CardContent, CardActions, Typography, Button } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import OilBarrelIcon from "@mui/icons-material/OilBarrel";
import NorthIcon from "@mui/icons-material/North";
import type { Application } from "../../Types/interfaces";
import AppCardStyles from "./AppCardStyles";
import icons from "./icons/index";

interface AppCardProps {
    app: Application;
    hasAccess: boolean;
    allowedApps: Record<string, string | null>;
    onRequestAccess: (isOpen: boolean, appUuid: string, appName: string) => void;
}

const AppCard: React.FC<AppCardProps> = ({
    app,
    hasAccess,
    allowedApps,
    onRequestAccess
}) => {
    const theme = useTheme();
    const isLightMode = theme.palette.mode === "light";
    const appColor = isLightMode ? app.lightMode : app.darkMode;

    const IconComponent = icons[app.shortName]
        ? isLightMode
            ? icons[app.shortName].light
            : icons[app.shortName].dark
        : OilBarrelIcon; // Fallback icon

    const shortNameColor = hasAccess ? appColor : theme.palette.grey[400];
    const appUrl = hasAccess ? allowedApps[app.uuid] || app.url : app.requestAccessUrl;

    return (
        <Card key={app.uuid} sx={AppCardStyles.card}>
            <CardContent sx={{ position: "relative" }}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 2,
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                        }}
                    >
                        <Box sx={AppCardStyles.shortNameBox(shortNameColor)}>
                            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                                {app.shortName}
                            </Typography>
                        </Box>
                        <Typography
                            variant="body1"
                            sx={{ fontWeight: "bold", color: "text.primary" }}
                        >
                            {app.name}
                        </Typography>
                    </Box>
                    <Box
                        className="arrow-icon"
                        sx={{
                            opacity: 0,
                            transform: "rotate(0deg)",
                            transition:
                                "opacity 0.5s ease-in-out, transform 0.5s ease-in-out, color 0.5s ease-in-out",
                            color: "grey.500",
                        }}
                    >
                        <NorthIcon fontSize="medium" />
                    </Box>
                </Box>
                <Box sx={{ ...AppCardStyles.iconBox, color: appColor }}>
                    <IconComponent width="64" height="64" />
                </Box>
            </CardContent>

            <CardActions
                sx={{
                    justifyContent: "center",
                    marginTop: "auto",
                    paddingBottom: 2,
                }}
            >
                {hasAccess ? (
                    <Button
                        variant="contained"
                        color="primary"
                        href={appUrl ?? "#"}
                        rel="noopener noreferrer"
                    >
                        Access now
                    </Button>
                ) : (
                    <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => onRequestAccess(true, app.uuid, app.name)}
                    >
                        Request Access
                    </Button>
                )}
            </CardActions>
        </Card>
    );
};

export default AppCard;