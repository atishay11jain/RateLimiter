// For sliding Window, We will insert the request timestamp in sortedSet.
// As soon as a request comes, we will generate a key, If key exists then we will remove the timestamp entries which are older than
// currenttime - ttl. Then we will add the current timestamp to the sortedSet. Now we will check the size of the sortedSet. If the 
// size is greater than the limit then we will return false.
// If key don't exists we will create a new sortedSet with the current timestamp and set the SortedSet expiry to ttl. Also for every request we will increase the sorted set by ttl.
