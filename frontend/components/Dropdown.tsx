import React, { useState } from "react";
import { StyleSheet, View, Text, TextInput, Animated } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import colors from "../assets/theme/colors";

interface DropdownProps {
  data: { label: string; value: string | number }[];
  value: string | number | null;
  onChange: (item: { label: string; value: string | number }) => void;
  placeholder?: string;
  maxHeight?: number;
  style?: object;
  icon?: React.ReactNode; 
  searchable?: boolean; // Add search functionality
}

const DropdownComponent: React.FC<DropdownProps> = ({
  data,
  value,
  onChange,
  placeholder = "Select a species",
  maxHeight = 300,
  style,
  icon,
  searchable = false, 
}) => {
  const [searchText, setSearchText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0]; 
  const filteredData = searchable
    ? data.filter((item) =>
        item.label.toLowerCase().includes(searchText.toLowerCase())
      )
    : data;

  const renderItem = (item: { label: string; value: string | number }) => (
    <View style={styles.item}>
      <Text style={styles.textItem}>{item.label}</Text>
    </View>
  );

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.wrapper}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Dropdown
        style={[
          styles.dropdown,
          style,
          isFocused && { borderColor: colors.primary },
        ]}
        containerStyle={styles.container}
        placeholderStyle={styles.placeholderStyle}
        selectedTextStyle={styles.selectedTextStyle}
        iconStyle={styles.iconStyle}
        iconColor={colors.text}
        activeColor={colors.chatGPTCardBackground}
        data={filteredData}
        maxHeight={maxHeight}
        labelField="label"
        valueField="value"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        renderItem={renderItem}
        onFocus={handleFocus}
        onBlur={handleBlur}
        search={searchable} 
        searchPlaceholder="Search..."
        onChangeText={searchable ? setSearchText : undefined}
        inputSearchStyle={styles.searchInput} 
      />
    </View>
  );
};

export default DropdownComponent;

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    marginRight: 8, 
  },
  dropdown: {
    flex: 1, 
    margin: 12,
    height: 50,
    backgroundColor: colors.card,
    borderRadius: 30,
    borderColor: `${colors.primary}80`,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  container: {
    borderRadius: 10,
    backgroundColor: colors.bottomnav,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  item: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
  },
  textItem: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Radio Canada",
    color: colors.text,
  },
  iconStyle: {
    width: 24,
    height: 24,
  },
  placeholderStyle: {
    fontSize: 16,
    fontFamily: "Radio Canada",
    color: colors.text,
  },
  selectedTextStyle: {
    fontSize: 16,
    fontFamily: "Radio Canada",
    fontWeight: "500",
    color: colors.text,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    margin: 8,
    backgroundColor: colors.white,
    color: colors.text,
  },
});