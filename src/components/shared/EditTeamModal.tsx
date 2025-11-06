// shared/EditTeamModal.tsx
"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, updateDoc } from "firebase/firestore";
import { Save, XCircle, Loader2, AlertTriangle, X } from "lucide-react";
import { db } from "../../firebase/config";
import { useAppContext } from "../../context/AppContext";
import type { Team } from "../../lib/types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { CustomDropdown } from "../ui/CustomDropdown";

interface EditTeamModalProps {
  team: Team | null;
  isOpen: boolean;
  onClose: () => void;
}

const EditTeamModal = ({ team, isOpen, onClose }: EditTeamModalProps) => {
  const { currentEvent, user, teams, floors, showToast } = useAppContext();
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [floorId, setFloorId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (team) {
      setName(team.name);
      setNumber(String(team.number));
      setFloorId(team.floorId);
      setError("");
    }
  }, [team]);

  const floorOptions = useMemo(
    () =>
      floors.map((f) => ({
        value: f.id,
        label: f.name,
      })),
    [floors],
  );

  const handleSave = async () => {
    if (!team || !currentEvent || !user) return;

    const newNumber = parseInt(number);
    if (isNaN(newNumber) || newNumber <= 0) {
      setError("Team number must be a valid, positive number.");
      return;
    }
    if (!name.trim()) {
      setError("Team name cannot be empty.");
      return;
    }
    if (!floorId) {
      setError("Team must be assigned to a floor.");
      return;
    }

    // Check for number conflicts
    const existingTeam = teams.find(
      (t) => t.number === newNumber && t.id !== team.id,
    );
    if (existingTeam) {
      setError(
        `Team number ${newNumber} is already taken by ${existingTeam.name}.`,
      );
      return;
    }

    // Check if new number is in the new floor's range
    const targetFloor = floors.find((f) => f.id === floorId);
    if (
      !targetFloor ||
      newNumber < targetFloor.teamNumberStart ||
      newNumber > targetFloor.teamNumberEnd
    ) {
      setError(
        `Team number ${newNumber} is outside the range for ${targetFloor?.name}.`,
      );
      return;
    }

    setIsLoading(true);
    setError("");

    const teamDocRef = doc(
      db,
      `users/${user.uid}/events/${currentEvent.id}/teams`,
      team.id,
    );

    try {
      await updateDoc(teamDocRef, {
        name: name.trim(),
        number: newNumber,
        floorId: floorId,
      });
      showToast("Team updated successfully!", "success");
      onClose();
    } catch (err) {
      console.error("Error updating team:", err);
      setError("Failed to save team. Please try again.");
      showToast("Failed to save team.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && team && (
        <motion.div
          key="edit-team-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            key="edit-team-content"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold">Edit Team</h3>
                <p className="text-sm text-zinc-400">
                  Modifying: {team.name} (#{team.number})
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-zinc-500 transition-colors hover:text-white"
                aria-label="Close modal"
              >
                <X className="size-6" />
              </button>
            </div>

            <div className="mt-6 space-y-4 border-t border-zinc-800 pt-6">
              <div>
                <Label htmlFor="edit-team-name">Team Name</Label>
                <Input
                  id="edit-team-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter team name"
                />
              </div>
              <div>
                <Label htmlFor="edit-team-number">Team Number</Label>
                <Input
                  id="edit-team-number"
                  type="number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="101"
                  min="1"
                />
              </div>
              <div>
                <Label htmlFor="edit-team-floor">Floor</Label>
                <CustomDropdown
                  value={floorId}
                  onChange={setFloorId}
                  options={floorOptions}
                  placeholder="Select a floor..."
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-md bg-rose-900/50 p-3 text-sm text-rose-300">
                  <AlertTriangle className="size-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-zinc-800 pt-4">
              <Button onClick={onClose}>
                <XCircle className="mr-2 size-4" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                Save Changes
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EditTeamModal;
