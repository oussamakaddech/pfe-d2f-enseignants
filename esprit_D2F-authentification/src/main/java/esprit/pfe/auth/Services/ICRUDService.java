package esprit.pfe.auth.services;

import java.util.List;

public interface ICRUDService<T, K> {
    List<T> findAll();

    T retrieveItem(K idItem);

    T add(T item);

    void delete(K id);

    T update(K id, T item);
}
