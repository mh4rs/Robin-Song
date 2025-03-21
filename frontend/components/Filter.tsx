import React, { useState } from "react";
import {View, Text, StyleSheet, TouchableOpacity,} from "react-native";
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
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [range, setRange] = useState<{ start?: string; end?: string }>({});

  const handleSpeciesChange = (item: { label: string; value: string | number }) => {
    const speciesValue = String(item.value);
    setSelectedSpecies(speciesValue);
    onFilterChange("species", speciesValue);
  };

  const onDayPress = (day: any) => {
    if (!range.start || (range.start && range.end)) {
      setRange({ start: day.dateString });
    } else {
      if (day.dateString >= range.start) {
        setRange({ start: range.start, end: day.dateString });
      } else {
        setRange({ start: day.dateString });
      }
    }
  };

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

  const applyFilters = () => {
    const start = range.start ? new Date(range.start) : null;
    const end = range.end ? new Date(range.end) : null;
    onFilterChange("date", { start, end });
    setIsModalVisible(false);
  };

  const clearFilters = () => {
    setSelectedSpecies(null);
    setRange({});
    onFilterChange("species", null);
    onFilterChange("date", null);
  };

  return (
    <View style={styles.container}>
      {/* Filter button to open modal */}
      <TouchableOpacity
        accessible={true}
        accessibilityHint="Double tap to open the filter screen."
        accessibilityRole="button"
        style={styles.filterButton}
        onPress={() => setIsModalVisible(true)}
      >
        <MaterialCommunityIcons
          name="filter-variant"
          size={20}
          color={colors.white}
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
            <View
              accessible={true}
              accessibilityRole="header"
              style={styles.titleContainer}
            >
              <MaterialCommunityIcons
                name="tune"
                size={24}
                color={colors.primary}
                style={styles.titleIcon}
              />
              <Text style={styles.modalTitle}>Filter Options</Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Close button"
              accessibilityHint="Double tap to close the filter screen."
              style={styles.closeButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Ionicons name="close" size={30} color={colors.white} />
            </TouchableOpacity>
          </View>

          {/* Species Filter */}
          <View
            accessible={true}
            accessibilityRole="header"
            accessibilityHint="Continue forward to select a species from a dropdown to filter your bird history list."
            style={styles.labelContainer}
          >
            <MaterialCommunityIcons
              name="bird"
              size={20}
              color={colors.secondary}
              style={styles.labelIcon}
            />
            <Text style={styles.label}>Select Species</Text>
          </View>
          <DropdownComponent
            data={speciesList}
            value={selectedSpecies}
            onChange={handleSpeciesChange}
            placeholder="Select a Species"
            style={styles.dropdown}
          />

          {/* Date Range Filter */}
          <View>
            <View
              accessible={true}
              accessibilityRole="header"
              accessibilityHint="Continue forward to select dates on a calendar to filter your bird history list."
              style={styles.labelContainer}
            >
              <MaterialCommunityIcons
                name="calendar-range"
                size={20}
                color={colors.secondary}
                style={styles.labelIcon}
              />
              <Text style={styles.label}>Select Date Range</Text>
            </View>
            <Calendar
              onDayPress={onDayPress}
              markingType="period"
              markedDates={getMarkedDates()}
              style={styles.calendar}
              theme={{
                calendarBackground: "#F5F5F5",
                backgroundColor: "#F5F5F5",
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
              icon={
                <MaterialCommunityIcons
                  name="broom"
                  size={20}
                  color={colors.white}
                  style={styles.buttonIcon}
                />
              }
              style={{ width: '49%' }}
            />
            <Button
              title="Apply"
              onPress={applyFilters}
              variant="primary"
              textStyle={{ fontSize: 16 }}
              icon={
                <MaterialCommunityIcons
                  name="check"
                  size={20}
                  color={colors.white}
                  style={styles.buttonIcon}
                />
              }
              style={{ width: '49%' }}
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
    alignItems: "center"
  },
  filterButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 10,
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
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom:16,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleIcon: {
    marginRight: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "Radio Canada",
    color: colors.primary,
  },
  closeButton: {
    backgroundColor: colors.accent,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdown: {
    marginBottom: 20,
  },
  dropdownIcon: {
    marginRight: 8,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  labelIcon: {
    marginRight: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: 'Radio Canada',
    color: colors.secondary,
  },
  calendar: {
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  buttonIcon: {
    marginRight: 8,
  },
});