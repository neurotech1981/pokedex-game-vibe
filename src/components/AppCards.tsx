import type { Application } from "../../Types/interfaces";
import {
	Box,
	Card,
	CardContent,
	CardActions,
	Typography,
	Button,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import OilBarrelIcon from "@mui/icons-material/OilBarrel";
import NorthIcon from "@mui/icons-material/North";
import icons from "./icons/index";
import { usePage } from "@inertiajs/react";
import type { AppPageProps } from "@/Types/inertia";
import AppCardStyles from "./AppCardStyles";
import RequestAccessModal from "@/Components/RequestAccessModal";
import { useState } from "react";
import AppCard from "./AppCard";

interface AppCardsProps {
	applications: Application[];
}

const AppCards: React.FC<AppCardsProps> = ({ applications }) => {
	const theme = useTheme();
	const isLightMode = theme.palette.mode === "light";

	// Fetch permissions from session
	const { auth } = usePage<AppPageProps>().props;
	const [requestAccessModal, setRequestAccessModal] = useState<boolean>(false);
	const [requestApplicationUuid, setRequestApplicationUuid] =
		useState<string>("");
	const [requestApplicationName, setRequestApplicationName] =
		useState<string>("");
	const backendPermissions = auth.permissions || {};

	const openModal = (isOpen: boolean, appUuid: string, appName: string) => {
		setRequestApplicationUuid(appUuid);
		setRequestApplicationName(appName);
		setRequestAccessModal(isOpen);
	};

	// Extract allowed application UUIDs from permissions
	const allowedUUIDs = Object.values(backendPermissions).map(
		({ module }) => module.uuid,
	);

	// Extract allowed application UUIDs from permissions
	const allowedApps = Object.values(backendPermissions).reduce(
		(acc, { module }) => {
			acc[module.uuid] = module.route || null; // Store route if available
			return acc;
		},
		{} as Record<string, string | null>,
	);

	// Apps the user has access to
	const userHasAccess = applications.filter((app) =>
		allowedUUIDs.includes(app.uuid),
	);

	// Apps the user does NOT have access to
	const userNeedsAccess = applications.filter(
		(app) => !allowedUUIDs.includes(app.uuid),
	);

	return (
		<>
			{/* SECTION 1: Apps the user has access to */}
			<Typography variant="h4" sx={{ padding: 2 }}>
				Applications
			</Typography>
			<Box sx={AppCardStyles.gridContainer}>
				{userHasAccess.map((app) => (
					<AppCard
						key={app.uuid}
						app={app}
						hasAccess={true}
						allowedApps={allowedApps}
						onRequestAccess={openModal}
					/>
				))}
			</Box>

			{/* SECTION 2: Apps the user does NOT have access to */}
			{userNeedsAccess.length > 0 && (
				<>
					<Typography variant="h4" sx={{ padding: 2 }}>
						Request Access
					</Typography>
					<Box sx={AppCardStyles.gridContainer}>
						{userNeedsAccess.map((app) => (
							<AppCard
								key={app.uuid}
								app={app}
								hasAccess={false}
								allowedApps={allowedApps}
								onRequestAccess={openModal}
							/>
						))}
					</Box>
				</>
			)}
			<RequestAccessModal
				open={requestAccessModal}
				appUuid={requestApplicationUuid}
				handleClose={() =>
					openModal(false, requestApplicationUuid, requestApplicationName)
				}
				applicationName={requestApplicationName}
			/>
		</>
	);
};

export default AppCards;
