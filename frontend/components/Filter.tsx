import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import Modal from "react-native-modal";
import DateTimePickerModal from "react-native-modal-datetime-picker";

import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import DropdownComponent from "./Dropdown";
import Button from "./Button";
import colors from "../assets/theme/colors";

interface Species {
  label: string;
  value: string;
}

interface FilterProps {
  speciesList: Species[];
  onFilterChange: (filterType: string, value: any) => void;
}

const Filter: React.FC<FilterProps> = ({ speciesList, onFilterChange }) => {
  const [isFilterModalVisible, setFilterModalVisible] = useState<boolean>(false);

  // Filter states
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Track date picker visibility
  const [datePickerType, setDatePickerType] = useState<"start" | "end" | null>(null);

  // =============== SPECIES HANDLING ===============
  const handleSpeciesChange = (item: { label: string; value: string | number }) => {
    const speciesValue = String(item.value);
    setSelectedSpecies(speciesValue);
    onFilterChange("species", speciesValue);
  };

  // =============== DATE PICKER: CANCEL / CONFIRM ===============
  const handleDateConfirm = (date: Date) => {
    if (datePickerType === "start") {
      setStartDate(date);
      onFilterChange("date", { start: date, end: endDate });
    } else if (datePickerType === "end") {
      setEndDate(date);
      onFilterChange("date", { start: startDate, end: date });
    }
    setDatePickerType(null); // Close the picker
  };

  const handleDateCancel = () => {
    setDatePickerType(null);
  };

  // =============== CLEAR & APPLY FILTERS ===============
  const clearFilters = () => {
    setSelectedSpecies(null);
    setStartDate(null);
    setEndDate(null);

    onFilterChange("species", null);
    onFilterChange("date", null);
  };

  const applyFilters = () => {
    onFilterChange("date", { start: startDate, end: endDate });
    setFilterModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Button that opens the Filter modal */}
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setFilterModalVisible(true)}
      >
        <MaterialCommunityIcons
          name="filter-variant"
          size={20}
          color={colors.chatGPTCardBackground}
          style={styles.filterIcon}
        />
        <Text style={styles.filterButtonText}>Filter</Text>
      </TouchableOpacity>

      {/* The Filter Modal */}
      <Modal
        isVisible={isFilterModalVisible}
        backdropOpacity={0.5}
        useNativeDriver={false}
        onBackdropPress={() => setFilterModalVisible(false)}
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalTopBar}>
            <Text style={styles.modalTitle}>Filter Options</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Ionicons name="close" size={30} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Species dropdown */}
          <DropdownComponent
            data={speciesList}
            value={selectedSpecies}
            onChange={handleSpeciesChange}
            placeholder="Filter by Species"
            style={styles.dropdown}
          />

          {/* Date Range section */}
          <View style={styles.dateFilterContainer}>
            <Text style={styles.label}>Date Range</Text>

            <Button
              title={
                startDate
                  ? `Start: ${startDate.toLocaleDateString()}`
                  : "Select Start Date"
              }
              onPress={() => setDatePickerType("start")}
              variant="secondary"
              textStyle={{ fontSize: 16 }}
            />

            <Button
              title={
                endDate
                  ? `End: ${endDate.toLocaleDateString()}`
                  : "Select End Date"
              }
              onPress={() => setDatePickerType("end")}
              variant="secondary"
              textStyle={{ fontSize: 16 }}
            />
          </View>

          {/* Clear & Apply Buttons */}
          <Button
            title="Clear Filters"
            onPress={clearFilters}
            variant="secondary"
            textStyle={{ fontSize: 16 }}
          />
          <Button
            title="Apply"
            onPress={applyFilters}
            variant="primary"
            textStyle={{ fontSize: 16 }}
          />
        </View>
      </Modal>

      {/* The separate date-time picker (not nested in the filter modal) */}
      <DateTimePickerModal
        isVisible={!!datePickerType}
        mode="date"
        onConfirm={handleDateConfirm}
        onCancel={handleDateCancel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginRight: 20,
  },
  filterButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 50,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
  },
  filterButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Radio Canada",
  },
  filterIcon: {
    marginRight: 4,
  },
  modal: {
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    padding: 20,
    backgroundColor: colors.background,
    borderRadius: 15,
  },
  modalTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Radio Canada",
    color: colors.secondary,
  },
  closeButton: {
    backgroundColor: colors.accent,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  dropdown: {
    marginBottom: 15,
  },
  dateFilterContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
});

export default Filter;
