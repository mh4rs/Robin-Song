import React, { useState, useEffect, useCallback, useMemo } from "react";
import {SafeAreaView, View,Text, StyleSheet, Image, ActivityIndicator, SectionList,TouchableOpacity,Alert, Linking,} from "react-native";
import {collection, query, orderBy,limit, startAfter, getDocs, where} from "firebase/firestore";
import { db } from "../../database/firebaseConfig";
import SearchBar from "../components/SearchBar";
import Filter from "../components/Filter";
import colors from "../assets/theme/colors";
import axios from "axios";
import debounce from "lodash.debounce";
import Fuse from "fuse.js";

// Firestore bird interface
interface BirdHistory {
  id: string;
  bird: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
}

interface BirdData {
  imageUrl: string;
  audubonUrl: string;
}

interface BirdSection {
  title: string;
  data: BirdHistory[];
}

const PAGE_SIZE = 20;

const HistoryScreen: React.FC = () => {
  const [birds, setBirds] = useState<BirdHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [birdDataMap, setBirdDataMap] = useState<{ [birdName: string]: BirdData }>({});

  const fetchBirds = async (reset = false) => {
    if (!hasMore && !reset) return;
    try {
      reset ? setLoading(true) : setLoadingMore(true);

      let q = query(
        collection(db, "birds"),
        orderBy("timestamp", "desc"),
        limit(PAGE_SIZE)
      );

      if (selectedSpecies) {
        q = query(q, where("bird", "==", selectedSpecies));
      }

      if (startDate || endDate) {
        q = query(
          q,
          where("timestamp", ">=", startDate || new Date(0)),
          where("timestamp", "<=", endDate || new Date())
        );
      }

      if (!reset && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const fetchedBirds = snapshot.docs.map((doc) => ({
        id: doc.id,
        bird: doc.data().bird || "Unknown Bird",
        latitude: doc.data().latitude || 0,
        longitude: doc.data().longitude || 0,
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      }));

      const newBirds = reset ? fetchedBirds : [...birds, ...fetchedBirds];
      setBirds(newBirds);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching birds:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setSearch(query);
    }, 300),
    []
  );

  const handleSearch = (query: string) => {
    debouncedSearch(query);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBirds(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedSpecies, startDate, endDate]);

  const fetchDataForBird = async (birdName: string) => {
    try {
      const infoRes = await axios.get<{ url: string }>(
        "http://192.168.1.108:5000/bird-info",
        { params: { bird: birdName } }
      );
      const audubonUrl = infoRes.data.url || "";
      if (!audubonUrl) {
        setBirdDataMap((prev) => ({
          ...prev,
          [birdName]: { imageUrl: "", audubonUrl: "https://www.audubon.org" },
        }));
        return;
      }
      const scrapeRes = await axios.get<{ image_url?: string }>(
        "http://192.168.1.108:5000/scrape-bird-info",
        { params: { url: audubonUrl } }
      );
      const imageUrl = scrapeRes.data.image_url || "";
      setBirdDataMap((prev) => ({
        ...prev,
        [birdName]: { imageUrl, audubonUrl },
      }));
    } catch (error: any) {
      console.error("Error fetching data for bird:", birdName, error);
      setBirdDataMap((prev) => ({
        ...prev,
        [birdName]: { imageUrl: "", audubonUrl: "https://www.audubon.org" },
      }));
    }
  };

  useEffect(() => {
    const uniqueBirdNames = Array.from(new Set(birds.map((b) => b.bird)));
    const missingBirdNames = uniqueBirdNames.filter((name) => !(name in birdDataMap));
    missingBirdNames.forEach((birdName) => {
      fetchDataForBird(birdName);
    });
  }, [birds, birdDataMap]);


  const fuse = useMemo(() => new Fuse(birds, { keys: ["bird"], threshold: 0.3 }), [birds]);
  const filteredBirds = useMemo(() => {
    if (!search) return birds;
    const searchLower = search.trim().toLowerCase();
    const exactMatches = birds.filter(
      (bird) => bird.bird.toLowerCase() === searchLower
    );
    if (exactMatches.length > 0) {
      return exactMatches;
    }
    return fuse.search(search).map((result) => result.item);
  }, [search, birds, fuse]);

  const groupByMonth = useCallback((data: BirdHistory[]): BirdSection[] => {
    const grouped: { [key: string]: BirdHistory[] } = {};
    data.forEach((item) => {
      const month = item.timestamp.toLocaleString("default", { month: "long", year: "numeric" });
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(item);
    });
    return Object.keys(grouped).map((month) => ({ title: month, data: grouped[month] }));
  }, []);

  const sections = useMemo(() => groupByMonth(filteredBirds), [filteredBirds, groupByMonth]);

  const uniqueSpeciesList = useMemo(
    () =>
      Array.from(new Set(birds.map((b) => b.bird)))
        .map((species) => ({ label: species, value: species }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [birds]
  );

  const handleFilterChange = (
    filterType: string,
    filterValue: string | { start?: Date; end?: Date } | null
  ) => {
    if (filterType === "species") {
      setSelectedSpecies(filterValue as string);
      setSearch(""); // Reset search when species filter is applied
    } else if (filterType === "date") {
      if (typeof filterValue === "object" && filterValue !== null) {
        setStartDate(filterValue.start || null);
        setEndDate(filterValue.end || null);
      } else {
        setStartDate(null);
        setEndDate(null);
      }
      setSearch(""); // Reset search when date filter is applied
    }
  };

  const loadMoreBirds = () => {
    if (!loadingMore && hasMore) {
      fetchBirds();
    }
  };

  const renderBirdItem = useCallback(
    ({ item }: { item: BirdHistory }) => {
      const data = birdDataMap[item.bird] || { imageUrl: "", audubonUrl: "" };
      const imageUrl = data.imageUrl;
      const audubonUrl = data.audubonUrl;
      return (
        <View style={styles.historyCard} key={item.id}>
          <Image
            source={
              imageUrl
                ? { uri: imageUrl }
                : require("../assets/img/logos/robinAppIcon.png")
            }
            style={styles.birdImage}
          />
          <View style={styles.entryDetails}>
            <TouchableOpacity
              onPress={() => {
                if (audubonUrl) {
                  Linking.openURL(audubonUrl);
                } else {
                  Alert.alert("No Audubon page found for this bird.");
                }
              }}
            >
              <Text style={[styles.birdName, { textDecorationLine: "underline" }]}>
                {item.bird}
              </Text>
            </TouchableOpacity>
            <Text style={styles.birdLocation}>
              Lat: {item.latitude}, Lon: {item.longitude}
            </Text>
          </View>
          <View style={styles.entryTime}>
            <Text style={styles.entryDate}>{item.timestamp.toLocaleDateString()}</Text>
            <Text style={styles.entryHour}>{item.timestamp.toLocaleTimeString()}</Text>
          </View>
        </View>
      );
    },
    [birdDataMap]
  );

  const renderSectionHeader = useCallback(
    ({ section: { title } }: { section: { title: string } }) => (
      <Text style={styles.monthHeader}>{title}</Text>
    ),
    []
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchBar label="Search..." search={search} setSearch={setSearch} onSearch={handleSearch} />
      </View>

      {/* Filter Component */}
      <Filter speciesList={uniqueSpeciesList} onFilterChange={handleFilterChange} />

      {/* Bird List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderBirdItem}
          renderSectionHeader={renderSectionHeader}
          onEndReached={loadMoreBirds}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : !hasMore ? (
              <Text style={styles.endOfHistory}>End of History.</Text>
            ) : null
          }
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchContainer: { marginVertical: 8, marginHorizontal: 20 },
  monthHeader: {
    fontSize: 24,
    color: colors.secondary,
    fontWeight: "bold",
    backgroundColor: colors.background,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 10,
    marginVertical: 5,
    marginHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  birdImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  entryDetails: { flex: 1 },
  birdName: { fontSize: 18, color: colors.primary, marginBottom: 2 },
  birdLocation: { fontSize: 16, color: colors.text },
  entryTime: { alignItems: "flex-end" },
  entryDate: { fontSize: 14, color: colors.secondary, fontWeight: "bold", marginBottom: 2 },
  entryHour: { fontSize: 14, color: colors.text },
  endOfHistory: { fontSize: 16, color: colors.accent, textAlign: "center", marginVertical: 20 },
});

export default HistoryScreen;