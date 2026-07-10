import React, { useEffect, useState } from 'react';
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { copyToClipboard } from '../utils/shareCodes';

interface ShowProps {
    open: boolean;
    title: string;
    /** The code to share; the dialog copies it and shows it for manual copy. */
    code: string;
    onClose: () => void;
}

/** Displays a share code with a copy button (fallback: select-and-copy by hand). */
export const ShareCodeDialog: React.FC<ShowProps> = ({ open, title, code, onClose }) => {
    const [copied, setCopied] = useState<boolean | null>(null);
    useEffect(() => {
        if (!open) return;
        setCopied(null);
        void copyToClipboard(code).then(ok => setCopied(ok));
    }, [open, code]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {copied ? 'Copied to your clipboard! Paste it to a friend.' : 'Copy this code and send it to a friend.'}
                    {' '}({(code.length / 1024).toFixed(1)} KB)
                </Typography>
                <TextField
                    value={code}
                    multiline
                    fullWidth
                    minRows={3}
                    maxRows={6}
                    slotProps={{ input: { readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.7rem', wordBreak: 'break-all' } } }}
                    onFocus={e => e.target.select()}
                />
            </DialogContent>
            <DialogActions>
                <Button
                    startIcon={<ContentCopyIcon />}
                    onClick={() => void copyToClipboard(code).then(ok => setCopied(ok))}
                >
                    Copy again
                </Button>
                <Button variant="contained" onClick={onClose}>Done</Button>
            </DialogActions>
        </Dialog>
    );
};

interface ImportProps {
    open: boolean;
    title: string;
    label: string;
    /** Decode + apply; throw a user-readable Error to show it inline. */
    onImport: (code: string) => void;
    onClose: () => void;
}

/** Paste-a-code import dialog with inline validation errors. */
export const ImportCodeDialog: React.FC<ImportProps> = ({ open, title, label, onImport, onClose }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        if (open) {
            setCode('');
            setError(null);
        }
    }, [open]);

    const handleImport = () => {
        try {
            onImport(code);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed.');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                {error && <Alert severity="warning" sx={{ mb: 1.5 }}>{error}</Alert>}
                <TextField
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder={label}
                    multiline
                    fullWidth
                    minRows={3}
                    maxRows={6}
                    slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: '0.7rem', wordBreak: 'break-all' } } }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={handleImport} disabled={!code.trim()}>
                    Import
                </Button>
            </DialogActions>
        </Dialog>
    );
};
