package esprit.pfe.auth.Services;

import java.util.List;

public interface ICRUDService<T, ID> {
    List<T> findAll();

    T retrieveItem(ID idItem);

    T add(T item);

    void delete(ID id);

    T update(ID id, T item);
}
