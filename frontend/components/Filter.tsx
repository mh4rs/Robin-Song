import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import Modal from "react-native-modal";
import { Calendar } from "react-native-calendars";
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
  // Modal visibility and filter state
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  // We'll store the date range as strings (in "YYYY-MM-DD" format) for the calendar, and later convert to Date objects
  const [range, setRange] = useState<{ start?: string; end?: string }>({});

  // Handle species selection
  const handleSpeciesChange = (item: { label: string; value: string | number }) => {
    const speciesValue = String(item.value);
    setSelectedSpecies(speciesValue);
    onFilterChange("species", speciesValue);
  };

  // When a day is pressed on the calendar, update the range
  const onDayPress = (day: any) => {
    if (!range.start || (range.start && range.end)) {
      // Start a new range
      setRange({ start: day.dateString });
    } else {
      // Set end date only if it is after start date; otherwise, restart range
      if (day.dateString >= range.start) {
        setRange({ start: range.start, end: day.dateString });
      } else {
        setRange({ start: day.dateString });
      }
    }
  };

  // Build the markedDates object for the Calendar
  const getMarkedDates = () => {
    const marked: { [key: string]: any } = {};
    if (range.start) {
      marked[range.start] = { startingDay: true, color: colors.accent, textColor: "#ffffff" };
    }
    if (range.end) {
      marked[range.end] = { endingDay: true, color: colors.accent, textColor: "#ffffff" };
    }
    if (range.start && range.end) {
      let current = new Date(range.start);
      const end = new Date(range.end);
      while (current <= end) {
        const dateString = current.toISOString().split("T")[0];
        if (dateString !== range.start && dateString !== range.end) {
          marked[dateString] = { color: colors.accent, textColor: "#ffffff" };
        }
        current.setDate(current.getDate() + 1);
      }
    }
    return marked;
  };

  // When "Apply" is pressed, convert the selected range to Date objects and call onFilterChange
  const applyFilters = () => {
    const start = range.start ? new Date(range.start) : null;
    const end = range.end ? new Date(range.end) : null;
    onFilterChange("date", { start, end });
    setIsModalVisible(false);
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedSpecies(null);
    setRange({});
    onFilterChange("species", null);
    onFilterChange("date", null);
  };

  return (
    <View style={styles.container}>
      {/* Filter button to open the modal */}
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setIsModalVisible(true)}
      >
        <MaterialCommunityIcons
          name="filter-variant"
          size={20}
          color={colors.chatGPTCardBackground}
          style={styles.filterIcon}
        />
        <Text style={styles.filterButtonText}>Filter</Text>
      </TouchableOpacity>

      {/* Filter Modal */}
      <Modal
        isVisible={isModalVisible}
        onBackdropPress={() => setIsModalVisible(false)}
        backdropOpacity={0.5}
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalTopBar}>
            <Text style={styles.modalTitle}>Filter Options</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Ionicons name="close" size={30} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Species Filter */}
          <DropdownComponent
            data={speciesList}
            value={selectedSpecies}
            onChange={handleSpeciesChange}
            placeholder="Filter by Species"
            style={styles.dropdown}
          />

          {/* Date Range Filter */}
          <View style={styles.dateFilterContainer}>
            <Text style={styles.label}>Select Date Range</Text>
            <Calendar
              onDayPress={onDayPress}
              markingType="period"
              markedDates={getMarkedDates()}
              style={styles.calendar}
              theme={{
                backgroundColor: colors.background,
                calendarBackground: "#f0f0f0",
                textSectionTitleColor: colors.secondary,
                selectedDayBackgroundColor: colors.accent,
                selectedDayTextColor: "#ffffff",
                todayTextColor: colors.primary,
                dayTextColor: colors.text,
                textDisabledColor: "#d9e1e8",
                dotColor: colors.accent,
                selectedDotColor: "#ffffff",
                arrowColor: colors.primary,
                monthTextColor: colors.secondary,
                indicatorColor: colors.primary,
                textDayFontFamily: "Radio Canada",
                textMonthFontFamily: "Caprasimo",
                textDayHeaderFontFamily: "Radio Canada",
              }}
            />
          </View>

          <View style={styles.buttonRow}>
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
        </View>
      </Modal>
    </View>
  );
};

export default Filter;

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
    width: "90%",
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
    color: colors.secondary,
  },
  calendar: {
    borderRadius: 10,
    overflow: "hidden",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
});